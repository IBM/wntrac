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

API_ENDPOINT = "https://www.wikidata.org/w/api.php"

def get_name_from(entity_id):
    ''' Get name of wiki-entity using ID '''
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


def get_prop_idvalue_triples(pid, entity_id, result):
    e_pairs = []
    p_name = get_name_from(pid)
    p_values = result['entities'][entity_id]['claims'].get(pid, [])

    if len(p_values) > 1:
        p_values = p_values

    for e in p_values:
        rvalue = e['mainsnak']['datavalue']['value']
        rtype = e['mainsnak']['datatype']
        e_id=None
        if rtype == 'wikibase-item':
            e_id = rvalue.get('id')
            val = get_name_from(e_id)
        elif rtype == 'quantity':
            e_id = rtype
            val = rvalue.get('amount')
        if e_id is None:
            e_pairs.append((p_name, rtype, rvalue))
        else:
            e_pairs.append((p_name, e_id, val))
    return e_pairs


def get_id_pid_from(query, filt_pid=[]):
    output = (None, None, None)
    params = {
        'action': 'wbgetentities',
        'format': 'json',
        'languages': 'en',
        'titles': query,
        'sites': 'enwiki',
    }
    r = requests.get(API_ENDPOINT, params=params)

    if not r.ok:
        return output

    result = r.json()
    entities = result.get('entities')
    assert len(entities.keys()) == 1, "Invalid entity extracted for " + str(query) + " ; entities found =" + str(
        entities.keys())
    entity_id = list(entities.keys())[0]

    if entity_id == -1:
        return output
    if 'claims' not in result['entities'][entity_id].keys():
        return output

    e_triples = []
    prop_ids = list(result['entities'][entity_id]['claims'].keys())  # Extract all property IDs
    if len(filt_pid) > 0:
        prop_ids = list(set(filt_pid).intersection(set(prop_ids)))
    for pid in prop_ids:
        e_triples.extend(get_prop_idvalue_triples(pid, entity_id, result))
    output = (entity_id, prop_ids, e_triples)
    return output