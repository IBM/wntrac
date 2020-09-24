## Copyright 2020 IBM Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import spacy
import pandas as pd
from utils.wikify import wikify_location
from utils.type_mapper import type_map
import copy
from utils.wikidata_constants import WikidataPropertyID, WikidataEntityID, INST_OF_LOCATIONS

class FineGrainedClassifier:

    def __init__(self, resources_path):
        self.nlp = spacy.load("en_core_web_lg")
        print('Loaded Spacy models.')
        self.data_cache = dict()
        self.sopc_cache = self._load_sopc_cache(os.path.join(resources_path, 'sopc_mapper_resource.v4.csv'))

    def _type_mapper(self,type):
        if type in type_map:
            return type_map[type]
        else:
            return type

    def _get_location_country_code(self, location):
        location = location.lower().strip()
        if location not in self.data_cache:
            parent_country_code = ""
            location_code = ""
            try:
                parent_country = ""
                val = wikify_location(query=location, prop=[WikidataPropertyID.INSTANCE_OF, WikidataPropertyID.COUNTRY, WikidataPropertyID.ISO_3166_1_ALPHA_3, WikidataPropertyID.ISO_3166_2])
                if val is not None:
                    for prop in val.properties:
                        if prop.property_name == 'ISO_3166_1_ALPHA_3':
                            parent_country_code = prop.property_value
                            location_code=prop.property_value
                        if prop.property_name == 'ISO_3166_2':
                            location_code = prop.property_value
                            if 'US-' in location_code:
                                location_code=location_code.replace("US-","USA-")
                                parent_country_code = "USA"
                            else:
                                location_code = ""
                        if prop.property_name == 'COUNTRY':
                            parent_country = prop.property_value
                    if len(location_code)>0 and len(parent_country_code) == 0:
                        parent_country = parent_country.lower().strip()
                        if parent_country not in self.data_cache:
                            val = wikify_location(query=parent_country, prop=[WikidataPropertyID.INSTANCE_OF, WikidataPropertyID.COUNTRY, WikidataPropertyID.ISO_3166_1_ALPHA_3, WikidataPropertyID.ISO_3166_2])
                            if val is not None:
                                for prop in val.properties:
                                    if prop.property_name == 'ISO_3166_1_ALPHA_3':
                                        parent_country_code = prop.property_value
                                        self.data_cache[parent_country]="|"+parent_country_code
                                        break
                        else:
                            parent_country_code = self.data_cache[parent_country].split("|")[1]

            except:
                print("error for: "+location)
            self.data_cache[location]=location_code+"|"+parent_country_code
        #print(self.data_cache[location].split("|"))
        return self.data_cache[location].split("|")

    def _get_final_label(self, label, text, val_country):
        domestic = False
        international = False
        text= text.lower()
        if 'border' in text or 'foreign' in text or 'visa' in text or 'international' in text:
            international = True
        if 'domestic' in text:
            domestic = True
        final_label = ""
        if 'travel' in label:
            if 'flight' in text or 'airport' in text or 'air ' in text:
                if international or val_country is "foreign" or val_country is "both":
                    final_label = "international flight restrictions"
                if domestic:
                    final_label += "|domestic flight restrictions"
                if 'border' in text:
                    final_label += "|freedom of movement(nationality dependent)"
            if len(final_label.lower()) == 0:
                final_label = "freedom of movement(nationality dependent)"
        elif 'confinement' in label:
            if 'foreign' in text or 'visa' in text or 'international' in text:
                final_label = "introduction of quarantine policies"
            elif val_country is "foreign" or val_country is 'both' or 'passenger' in text:
                final_label = "introduction of quarantine policies"
            elif 'visitor' in text and (domestic or val_country is "domestic"):
                final_label = "introduction of quarantine policies"
            else:
                final_label = "confinement"
        #final_label += "\t" + val_country
        return final_label

    def _get_parent_country_code(self, locations, article_code):
        other_location_codes=set()
        val_country = "none"
        if len(article_code)>0:
            domestic_count = 0
            foreign_count = 0
            for location in locations:
                if location is not None and len(location)>0:
                    location_code, country_code = self._get_location_country_code(location)
                    #print("loc"+str(location)+"\tcode:"+str(location_code))
                    if len(article_code)>0 and article_code != "NONE":
                        if len(location_code) > 0 or len(country_code) > 0:
                            if location_code == article_code:
                                domestic_count += 1
                            elif country_code == article_code:
                                domestic_count+=1
                            else:
                                foreign_count += 1
                                other_location_codes.add(location_code)
            if domestic_count > 0 or foreign_count > 0:
                if domestic_count == 0:
                    val_country = "foreign"
                elif foreign_count == 0:
                    val_country = "domestic"
                else:
                    val_country = "both"
        return val_country, list(other_location_codes)

    def _spacy_wikification(self, df):
        df['wikified']=""
        wikified_rows=[]
        for idx, row in df.iterrows():
            doc = self.nlp(row['text'])
            wikified=[]
            for sent in doc.sents:
                for ent in sent.ents:
                    if ent.label_ is 'GPE':
                        wikified.append(ent.text.title())
                    if ent.label_ is 'NORP':
                        wikified.append(ent.text.title())
                    if ent.label_ is 'LOC':
                        wikified.append(ent.text.title())
                    if ent.label_ is 'ORG':
                        wikified.append(ent.text.title())
            wikified_rows.append('|'.join(wikified))
        df['wikified']=wikified_rows

    def _travel_confinement_mapper(self, df):
        new_rows=[]
        for idx, row in df.iterrows():
            label = row['type'].lower()
            if label not in ['confinement', 'travelrestrictions']:
                new_rows.append(row)
                continue
            article_country_code = row['country']
            val_country, other_location_codes=self._get_parent_country_code(row['wikified'].split("|"), article_country_code)
            row['type'] = self._get_final_label(label, row['text'], val_country).split("|")[0]
            not_added=True
            if len(other_location_codes)>0:
                for loc_code in other_location_codes:
                    row_copy=copy.deepcopy(row)
                    if len(loc_code.strip())>0:
                        row_copy['value']=loc_code
                        new_rows.append(row_copy)
                        not_added=False
            if len(other_location_codes)==0 or not_added:
                    new_rows.append(row)
        return pd.DataFrame(new_rows)

    def _load_sopc_cache(self, res_path):
        label_to_word_to_ev = dict()
        res = pd.read_csv(res_path)
        for idx, row in res.iterrows():
            label = row['NLPlabel']
            if label not in label_to_word_to_ev:
                label_to_word_to_ev[label] = dict()
            for i in range(1, 6):
                col_name = 'event_value=' + str(i)
                if str(row[col_name]) == '--':
                    break
                else:
                    words = str(row[col_name]).lower().split('|')
                    for word in words:
                        label_to_word_to_ev[label][word] = i
            generic_wstr = str(row['keywords'])
            if generic_wstr == 'nan':
                continue
            else:
                generic_words = generic_wstr.lower().split('|')
                for word in generic_words:
                    if word not in label_to_word_to_ev[label].keys():
                        # Default event-value
                        label_to_word_to_ev[label][word] = -1
        return label_to_word_to_ev

    def _granularize_sopc(self, text):
        text = text.lower()
        triples = []
        for label, word_to_ev in self.sopc_cache.items():
            for word, ev in word_to_ev.items():
                word = word.lower()
                if word in text:
                    triples.append((label, word, word_to_ev[word]))
        label_to_value_to_evidence = dict()
        for label, word, ev in triples:
            if label not in label_to_value_to_evidence:
                label_to_value_to_evidence[label] = dict()
            if ev not in label_to_value_to_evidence[label]:
                label_to_value_to_evidence[label][ev] = []
            if word.lower() not in label_to_value_to_evidence[label][ev]:
                label_to_value_to_evidence[label][ev].append(word.lower())
        for label in label_to_value_to_evidence.keys(): # Remove -1 if other event-values present
            if len(label_to_value_to_evidence[label].keys()) > 1 and -1 in label_to_value_to_evidence[label].keys():
                del label_to_value_to_evidence[label][-1]
        return label_to_value_to_evidence

    def _service_or_place_closed_mapper(self, df):
        new_rows = []
        for idx, row in df.iterrows():
            nlp_label = str(row['type']).lower()
            if nlp_label not in ['serviceorplaceclosed']:
                new_rows.append(row)
                continue
            elif nlp_label in ['serviceorplaceclosed']:
                text = str(row['text']).lower()
                label_to_value_to_evidence = self._granularize_sopc(text)
                if len(label_to_value_to_evidence.keys()) == 0:
                    new_rows.append(row)
                    continue
                for glabel in label_to_value_to_evidence.keys():
                    event_values = list(label_to_value_to_evidence[glabel].keys())
                    for i in range(len(event_values)):
                        event_value = event_values[i]
                        if event_value == -1:
                            event_value = ""
                        nrow = row.copy()
                        nrow['type'] = glabel
                        nrow['value'] = event_value
                        new_rows.append(nrow)
        return pd.DataFrame(new_rows)

    def leaf_node_mapper(self, df):
        if 'wikified' not in df:
            self._spacy_wikification(df)
        df = self._service_or_place_closed_mapper(df)
        df = self._travel_confinement_mapper(df)
        df['type'] = df.apply(lambda row: self._type_mapper(row['type']), axis=1)
        return df