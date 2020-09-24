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

import pandas as pd

def get_docid(doc_url):
    if 'title' not in doc_url:
        doc_id = doc_url.replace("https://en.wikipedia.org/wiki/", "")
    else:
        doc_id = ""
        param1 = 'title='
        start_idx = doc_url.find(param1) + len(param1)
        param2 = '&oldid='
        end_idx = doc_url.find(param2)
        if end_idx == -1:
            doc_id = doc_url[start_idx:]
        else:
            doc_id = doc_url[start_idx:end_idx]
    return doc_id

def load_iso_codes(filename):
    region_to_code = dict()
    docid_to_code = dict()
    iso_codes_df = pd.read_csv(filename)
    for idx, row in iso_codes_df.iterrows():
        country = str(row['country']).strip().title()
        country = clean_text(country)
        url = str(row['URL']).strip()
        doc_id = get_docid(url)
        iso_code = str(row['code']).strip()
        region_to_code[country]=iso_code
        docid_to_code[doc_id]=iso_code
    print ("Loaded iso code dictionaries. Size = ", len(region_to_code), len(docid_to_code))
    return region_to_code, docid_to_code

def clean_text(text):
    return text.lower().strip().replace("'","").replace(" ","_").replace("\n", "")