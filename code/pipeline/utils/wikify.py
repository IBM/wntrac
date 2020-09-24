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

import requests
from utils.wikidata_constants import WikidataPropertyID, WikidataEntityID, INST_OF_LOCATIONS

API_ENDPOINT = "https://www.wikidata.org/w/api.php"

plimit = dict({'P31':-1})

class WikidataProperty():     
    def __init__(self, property_id, property_name, property_value_type, property_value, property_value_wdid=None):
        self.property_id = property_id
        self.property_name = property_name
        self.property_value_type = property_value_type
        self.property_value = property_value
        self.property_value_wdid = property_value_wdid # Item ID if value of type 'wiki-base-item'
        
    def __str__(self):
        prop_txt = "WikidataProperty; PropertyID=%s, PropertyName=%s, PropertyValueType=%s, PropertyValue=%s"%(self.property_id, self.property_name, self.property_value_type, self.property_value)
        if self.property_value_wdid!=None:
            prop_txt += " , PropertyValueWdID=%s"%(self.property_value_wdid) 
        return prop_txt

class WikidataItem():
    def __init__(self, item_id, item_name, properties=None):
        self.item_id = item_id
        self.item_name = item_name
        self.properties = None
        if isinstance(properties, list):
            self.properties = properties
        else:
            self.properties = [properties]
        self.prop_dict = dict()

    def add_property(self, wd_property):
        if not self.properties:
            self.properties = []
        if isinstance(wd_property, list):
            self.properties.extend(wd_property)
        else:
            self.properties.append(wd_property)
            
    def get_property_dict(self):
        self.prop_dict = dict()
        for prop in self.properties:
            if prop.property_name not in self.prop_dict:
                self.prop_dict[prop.property_name]=[]
            self.prop_dict[prop.property_name].append(prop.property_value_wdid)
        return self.prop_dict
        
    def __str__(self):
        return "WikidataItem; ItemID=%s, ItemName=%s, NumProperties=%d" % (self.item_id, self.item_name, len(self.properties))

def get_wd_ids_from_api(query, limit=3):
    wd_ids = []
    params = {
    'action': 'wbsearchentities',
    'format': 'json',
    'language': 'en',
    'search':query,
    'limit':limit
    }
    r = requests.get(API_ENDPOINT, params = params)
    if not r.ok:
        #print ("Invalid API response for ", query)
        return wd_ids
    result = r.json()
    search_result = result.get('search')
    if not search_result:
        #print ("Invalid API response for ", query)
        return wd_ids
    wd_ids = [item.get('id') for item in search_result]
    #print ("Number of IDs extracted for ", query, " is ", len(wd_ids))
    return wd_ids

def get_wd_name_from_api(entity_id):
    ''' Get name of wikidataEntity using ID '''
    params = {
    'action': 'wbgetentities',
    'format': 'json',
    'languages': 'en',
    'ids':entity_id
    }
    r = requests.get(API_ENDPOINT, params = params)
    result = r.json()
    try:
        value = result['entities'][entity_id]['labels']['en']['value']
    except KeyError:
        value = None
    return value

def get_wd_entity_from_api(wd_id):
    '''
    Input wd_id = WikidataItemID (single or separated by '|')
    '''
    entities = []
    params = {
    'action': 'wbgetentities',
    'format': 'json',
    'languages': 'en',
    'ids':wd_id,
    'sitefilter':'enwiki',
    'props':'claims'
    }
    r = requests.get(API_ENDPOINT, params = params)
    if not r.ok:
        print ('Result not found for ', query, " ; API call failed.")
        return entities
    result = r.json()
    r_entities = result.get('entities')
    if not r_entities:
        return entities 
    entity_ids = wd_id.split('|')
    for entity_id in entity_ids:
        entity = r_entities.get(entity_id)
        if not entity or 'claims' not in entity.keys():
            #print ('Invalid entity extracted for ', entity_id, entity)
            continue
        else:
            entities.append(entity)
    return entities

def get_properties(r_entity, wd_property, limit=-1):
    properties = []
    entity_id = r_entity.get('id')
    p_id, p_name = wd_property.value, wd_property.name
    try:
        p_values = r_entity['claims'][p_id]
    except:
        p_values = []  
    if limit != -1:
        num_values = min(limit, len(p_values))
        p_values = p_values[:num_values]
    for p_value in p_values:
        try:
            rvalue = p_value['mainsnak']['datavalue']['value']
            rtype = p_value['mainsnak']['datatype']
            item_id = None
            if rtype == 'wikibase-item':
                item_id = rvalue.get('id')
                item_value = get_wd_name_from_api(item_id)
            elif rtype == 'quantity':
                item_value = rvalue.get('amount')
            else:
                item_value = rvalue
            properties.append(WikidataProperty(p_id, p_name, rtype, item_value, item_id))
            # print (entity_id, p_id, item_value)
        except:
            print ("Issue with property extraction ", p_id, " for entity_id ", entity_id)
            continue
    return properties

def get_filtered_pid(property_ids, filt_prop):
    filt_pid = [prop.value for prop in filt_prop]
    property_ids = list(set(filt_pid).intersection(set(property_ids)))
    # print ("Len of filtered props = ", len(property_ids))
    return property_ids

def get_wikidata_items(query, filt_prop, limit=3):
    output = []
    wd_ids = get_wd_ids_from_api(query, limit)
    if len(wd_ids) == 0:
        return output
    wd_id_str = "|".join(wd_ids)
    r_wd_items = get_wd_entity_from_api(wd_id_str)
    for r_wd_item in r_wd_items:
        property_ids = r_wd_item.get('claims').keys()
        if len(filt_prop) > 0:
            property_ids = get_filtered_pid(property_ids, filt_prop)
        property_ids = [WikidataPropertyID(pid) for pid in property_ids]
        properties = []
        for wd_property in property_ids:
            properties.extend(get_properties(r_wd_item, wd_property, limit=plimit.get(wd_property.value, 1)))
        wd_item = WikidataItem(r_wd_item.get('id'), query, properties)
        output.append(wd_item)
    return output

def filter_items(items, filter_map):
    '''Return the first item that matches atleast one property name and property value.'''
    for item in items:
        item_prop = item.get_property_dict()
        common_prop = set(item_prop.keys()).intersection(set(filter_map.keys()))
        if len(common_prop) == 0:
            continue
        for prop in common_prop:
            item_pval, filter_pval = item_prop[prop], filter_map[prop]
            filter_pval = [pval.value for pval in filter_pval]
            common_pval = set(item_pval).intersection(set(filter_pval))
            if len(common_pval) > 0:
                return item
            else:
                continue
    return None

def wikify_location(query, prop=[WikidataPropertyID.INSTANCE_OF, WikidataPropertyID.COUNTRY, WikidataPropertyID.POPULATION]):
    # Get <limit> items from API.
    items = get_wikidata_items(query, filt_prop=prop, limit=3)
    # Disambiguate based on Wikidata qualifiers specified.
    location_filter = dict({WikidataPropertyID.INSTANCE_OF.name:INST_OF_LOCATIONS})
    f_item = filter_items(items, location_filter)
    return f_item

def example_usage():
    query="USA"
    itm = wikify_location(query, prop=[WikidataPropertyID.INSTANCE_OF, WikidataPropertyID.COUNTRY, WikidataPropertyID.ISO_3166_1_ALPHA_3, WikidataPropertyID.ISO_3166_2])
    print (itm)
    for prop in itm.properties:
        print (prop)
        if prop.property_name == 'ISO_3166_1_ALPHA_3':
            print(prop.property_value)