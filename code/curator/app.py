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

from flask import Flask, render_template, request, jsonify , send_from_directory
import sqlalchemy as db
from logging import Formatter, FileHandler, INFO
from flask_cors import CORS
from flasgger import Swagger
import os
from utils import *
import uuid

from config import *

ANGULAR_DIST = "frontend/dist/wwcc"

app = Flask(__name__, static_folder='../static')
CORS(app)


@app.route('/')
@app.route('/<path:filename>')
def home(filename=""):
    if filename == "":
        filename = "index.html"
    return send_from_directory(ANGULAR_DIST, filename)


@app.route('/checkAssociation', methods=['GET'])
def checkAssociation():
    """
    Call this api to checkAssociation
    ---
    tags:
    - association , checkAssociation
    parameters:
      - name: evid_id
        in: query
        description: Evidence id
      - name: sessionKey
        in: query
        type: string
        description: session key
    responses:
      404:
        description: You landed in unknown territory..Please social distance yourself from such endpoints
      200:
        description: CandidateEvidence
        schema:
          id: CandidateEvidence
          properties:
            match_found:
              type: boolean
              default: true
            updated_data:
              type: string
              description: same as CandidateEvidence
     """

    arg_dict = {x[0]:x[1][0] for x in list(request.args.lists())}

    if 'evid_id' not in arg_dict.keys():
        return "evid_id is a required field", 400

    candidate_data = get_table_data('candidateevidence',
                                    filter_dict={
                                        'evid_id': arg_dict['evid_id']
                                    })

    if len(candidate_data) >0:
        candidate_data = candidate_data[0]
        data_to_update = arg_dict.copy()
        data_to_update.pop('sessionKey', None)


        matched_event , matched_evidences = get_event( type=candidate_data['type'],
                                                       country=candidate_data['country'],
                                                       date=candidate_data['date'],
                                                       value=candidate_data['value'],
                                                       restriction=candidate_data['restriction'],
                                                       get_evidences = True
                                                       )



        return jsonify({
            'match_found': "true" if len(matched_event)>0 else "false",
            'evidences': matched_evidences,
            'candidate_evidence': candidate_data,
            'event': matched_event[0] if len(matched_event) > 0 else {},
        }), 200

    else:
        return jsonify(f"CandidateEvidence with id: {arg_dict['evid_id']} was not found"),500




## Notebook which feeds to database
## https://dataplatform.cloud.ibm.com/analytics/notebooks/v2/e6b42359-7c20-4a25-8074-e355980fa42d/view?projectid=029337a8-8e57-47ca-8e83-a1fc5490662a&context=wdp

@app.route('/candidateEvidence', methods=['GET', 'POST'])
def CandidateEvidence(filter_dict=dict(),limit=50,offset=0):
    """
    Call this api to get / update candidateEvidence
    ---
    tags:
        - CandidateEvidence
    definitions:
      CandidateEvidence:
        type: object
        properties:
            country:
              type: string
              default: USA-MA
            crawl_date:
              type: string
              format: date
              default: 2020-04-29
            crawl_id:
              type: string
              format: uuid
              default: 2020-04-29_1c37bc3c-8a06-11ea-8893-89f91571ab5a
            date:
              type: string
              default: 04/12/2020|04/20/2020|09/14/2020
            discard:
              type: boolean
              default: true
            doc_url:
              type: string
              default: https://en.wikipedia.org/wiki/2020_coronavirus_pandemic_in_Massachusetts
            ev_id:
              type: string
              format: uuid
              default: 02ebb3ea-f1cc-457e-87d5-11fcc31d1533
            level_of_confidence:
              type: number
              format: float
              default: 0.8830000000
            level_of_enforcement:
              type: integer
              default: -1
            restriction:
              type: integer
              default: -1
            sent_id:
              type: string
              format: uuid
              default: 853e8279-25e3-46d0-88fc-95ee527b7c0e
            text:
              type: string
              default: This was the first postponement of the Boston Marathon since it was first held in 1897.In college sports, the National Collegiate Athletic Association canceled all winter and spring tournaments, most notably the Division
            type:
              type: string
              default: entertainment/cultural sector closure
            value:
              type: integer
              default: -1
    get:
        parameters:
          - name: limit
            in: query
            type: integer
            default: 20
            description: max number of results
          - name: offset
            in: query
            type: integer
            default: 0
            description: start result from here
          - name: sessionKey
            in: query
            type: string
            description: session key
          - name: unassociated
            in: query
            type: boolean
            description: to filter only unassociated CandidateEvidence
          - name: evid_id
            in: query
            type: boolean
            description: filter based on evid_id
        responses:
          404:
            description: You landed in unknown territory..Please social distance yourself from such endpoints
          200:
            description: CandidateEvidence
            schema:
                $ref: '#/definitions/CandidateEvidence'
    post:
        parameters:
          - name: sessionKey
            in: query
            type: string
            description: session key
          - name: evid_id
            type: string
            required: True
            in: query
          - name: discard
            type: string
            in: query
          - name: sent_id
            type: string
            in: query
          - name: country
            type: string
            in: query
          - name: date
            type: string
            in: query
          - name: level_of_confidence
            type: string
            in: query
          - name: level_of_enforcement
            type: string
            in: query
          - name: restriction
            type: string
            in: query
          - name: type
            type: string
            in: query
          - name: value
            type: string
            in: query
          - name: judgement_val
            type: string
            in: query
          - name: sessionKey
            type: string
            in: query
        responses:
          404:
            description: You landed in unknown territory..Please social distance yourself from such endpoints
          200:
            description: CandidateEvidence
            schema:
                $ref: '#/definitions/CandidateEvidence'
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if request.method == 'POST':


        if 'evid_id' not in arg_dict.keys():
            return "evid_id is a required field", 400

        if request.args.get('discard',False) in ['true',True,1]:
            ## Going to discard CandidateEvidence,
            ## which means to set the discard to 1
            updated_data, status = update_to_table(table_name='candidateevidence',
                                                   table_key='evid_id',
                                                   data_to_update={
                                                       'evid_id':  arg_dict['evid_id'],  ## TODO: check for sql injection
                                                       'discard': 1
                                                   }
                                                   )
            return jsonify({ "updated_data": updated_data[0]}) , status

        if request.args.get('restore',False) in ['true',True,1]:
            ## Going to restore(undo discard) CandidateEvidence,
            ## which means to set the discard to 0
            updated_data, status = update_to_table(table_name='candidateevidence',
                                                   table_key='evid_id',
                                                   data_to_update={
                                                       'evid_id':  arg_dict['evid_id'],  ## TODO: check for sql injection
                                                       'discard': 0
                                                   }
                                                   )
            return jsonify({ "updated_data": updated_data[0]}) , status

        # Only these columns can be updated / primary key
        update_keys =   [  'evid_id', ## required field
                           'sessionKey',  ## to track  , ## TODO: remove from this list, make a different list
                           'type',
                           'country',
                           'date',
                           'value',
                           'other_value',
                           'level_of_confidence',
                           'level_of_enforcement',
                           'restriction',
                           'citation_url',
                           'fine_grained_location',
                           'anno_provided_url',
                           'approx_date_bool',
                           'isNewType', # will be popped later
                           'isNewValue', # will be popped later
                           'valueHasTags' # will be popped later
                           ]

        for key in arg_dict.keys():
            if key not in update_keys:
                return  f"{key} is not a valid update field.  Only these fields can be updated: { ', '.join(update_keys)}", 400

        candidate_data = get_table_data('candidateevidence',
                                        filter_dict={
                                            'evid_id': arg_dict['evid_id']
                                        })

        if len(candidate_data) >0:

            data_to_update = arg_dict.copy()
            data_to_update.pop('sessionKey', None)
            data_to_update.pop('isNewType', None)
            data_to_update.pop('isNewValue', None)
            data_to_update.pop('valueHasTags', None)
            updated_data, status = update_to_table(table_name='candidateevidence',
                                                   table_key='evid_id',
                                                   data_to_update=data_to_update
                                                   )

            if status != 200:
                return updated_data, status

            matched_event, matched_evidences = get_event(  type=updated_data[0]['type'],
                                                           country=updated_data[0]['country'],
                                                           date=updated_data[0]['date'],
                                                           value=updated_data[0]['value'],
                                                           restriction=updated_data[0]['restriction'],
                                                           get_evidences = True
                                                           )
            evidence_updated = False

            if len(matched_event)>0:
                event_id = matched_event[0]["even_id"]
                evidence_table_data , evidence_updated = add_to_evidence(
                    candidate_data=updated_data[0],
                    event_id=event_id,
                    check_to_update=True,
                    anno_id=request.args.get('sessionKey', 0)
                )

            # Promote new value or tags to table
            if ('valueHasTags' in arg_dict and arg_dict['valueHasTags'] == "true" and 'other_value' in arg_dict):
                addNewValue('eventvalue', arg_dict['type'], arg_dict['other_value'], tags = True)

            elif ('isNewValue' in arg_dict and arg_dict['isNewValue'] == "true" and  'other_value' in arg_dict):
                addNewValue('eventvalue', arg_dict['type'], arg_dict['other_value'])





            return jsonify({
                'match_found': "true" if len(matched_event)>0 else "false",
                'evidence_updated' : "true" if evidence_updated else "false",
                'candidate_evidence': updated_data[0],
                'event': matched_event[0] if len(matched_event)>0 else  {},
                'evidences': matched_evidences

            }), 200

        else:
            return jsonify(f"CandidateEvidence with id: {arg_dict['evid_id']} was not found"),500

    else:

        ## GET call
        limit = request.args.get('limit',limit)
        offset = request.args.get('offset',offset)
        #  filter_dict is not implememted yet, we can pass a dict like {'evid_id': ......}
        #  filter_dict = request.args.get('filter',filter_dict)
        evid_id = request.args.get('evid_id',None)
        unassociated = True if (request.args.get('unassociated',False) in ['true','True','1']) else False
        softmatch = True if (request.args.get('softmatch',False) in ['true','True','1']) else False

        filter_dict = dict()
        if 'evid_id' in arg_dict.keys():
            filter_dict['evid_id'] = arg_dict['evid_id']

        if softmatch:
            geo = request.args.get('geo', None)
            old_id = request.args.get('oldId', None)
            if geo and old_id:
                result = get_softmatch(geo= geo, old_id = old_id)
            else:
                return 403, 'geo is needed to get softmatch'

            #        ce_with_document = result
            ce_with_document = {
                'candidateEvidence': result
            }

            if len(result) > 0:
                ## Assuming that there is going to be CEs for a single document
                data = result[0]
                ce_with_document['document_text'] = [{'crawl_id': data['crawl_id'],
                                                      'doc_url': data['doc_url'],
                                                      'text': get_text(crawl_id=data['crawl_id'],
                                                                       doc_url=data['doc_url']
                                                                       ),
                                                      'doc_status': doc_url_status(data['doc_url'])
                                                      }]

            return jsonify(ce_with_document), 200



        if unassociated:
            ## Join table
            result = unassosiated_evidence(filter_dict=filter_dict,
                                           limit=limit,
                                           offset=offset,
                                           anno_id=(arg_dict['sessionKey'] if 'sessionKey' in arg_dict.keys() else None)
                                           )
        else:
            result = get_table_data('candidateevidence',
                                    filter_dict=filter_dict,
                                    limit=limit,
                                    offset=offset)

        #        ce_with_document = result
        ce_with_document = {
            'candidateEvidence': result
        }

        if len(result)>0:
            ## Assuming that there is going to be CEs for a single document
            data = result[0]
            ce_with_document['document_text'] =  [{  'crawl_id': data['crawl_id'],
                                                     'doc_url':  data['doc_url'],
                                                     'text':     get_text( crawl_id=data['crawl_id'],
                                                                           doc_url=  data['doc_url']
                                                                           ),
                                                     'doc_status': doc_url_status(data['doc_url'])
                                                     }]

        return jsonify(ce_with_document) , 200


@app.route('/insertEvidence', methods=['POST'])
def insert_evidence():
    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    # Check whether an event already exists
    event_composite_keys = ['country', 'date', 'restriction', 'type', 'value']

    event_data = {}
    evidence_data = {}
    new_event_created = False
    new_evidence_created = True

    for key in event_composite_keys:
        event_data[key] = arg_dict.get(key)

    matched_event, matched_evidences = get_event(   event_data['type'], \
                                                    event_data['country'], \
                                                    event_data['date'], \
                                                    event_data['value'], \
                                                    event_data['restriction'], \
                                                    get_evidences = False     # Not implemented
                                                )

    # If event id needs to be updated, then create new event or reuse previously created event
    if len(matched_event) > 0:
        evidence_data['even_id'] = matched_event[0]['even_id']
    else:
        new_event_uuid = create_event(type=event_data['type'],
                                      country=event_data['country'],
                                      date=event_data['date'],
                                      value=event_data['value'],
                                      restriction=event_data['restriction']
                                      )
        evidence_data['even_id'] = new_event_uuid
        new_event_created = True

    # update evidence table
    update_fields =    ['anno_id', \
                        'anno_provided_url', \
                        'approx_date_bool', \
                        'country',
                        'date',
                        'citation_url',
                        'fine_grained_location',
                        'restriction',
                        'type',
                        'value',
                        'other_value']
    for update_field in update_fields:
        if arg_dict.get(update_field):
            evidence_data[update_field] = arg_dict.get(update_field)

    evidence_data['anno_id'] = arg_dict.get('sessionKey')
    evidence_data['evid_id'] = str(uuid.uuid1())
    evidence_data['sent_id'] = str(uuid.uuid1())

    if len(matched_evidences) > 0:
        check_fields =    ['anno_provided_url', \
                           'approx_date_bool', \
                           'country',
                           'date',
                           'citation_url',
                           'fine_grained_location',
                           'restriction',
                           'type',
                           'value',
                           'other_value']
        for matched_evidence in matched_evidences:
            unique_evidence = False
            for key in check_fields:
                if matched_evidence[key] != evidence_data[key]:
                    unique_evidence = True
            if not unique_evidence:
                new_evidence_created = False

    if new_evidence_created:
        new_evidence_created = insert_to_table(
            table_name='evidence',
            data=evidence_data
        )
    return jsonify({ "new_evidence": new_evidence_created,
                     "new_event": new_event_created
                     }) , 200


@app.route('/evidence', methods=['GET', 'POST'])
def evidence(filter_dict=dict(),limit=50,offset=0):

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}
    arg_dict.update({x[0]: x[1][0] for x in list(request.form.lists())})

    if request.method == 'POST':

        if 'id' not in arg_dict.keys():
            return "id is a required field", 400

        if 'delete' in arg_dict.keys():
            if request.args.get('delete',False) in ['True','true',True,1]:
                deleted = 1
            else:
                deleted = 0
            updated_data, status = update_to_table(table_name='evidence',
                                                   table_key='id',
                                                   data_to_update={
                                                       'id': arg_dict.get('id'),  ## TODO: check for sql injection
                                                       'deleted': deleted
                                                   }
                                                   )
            return jsonify({ "evidence": updated_data[0]}) , status
        else:
            # 1. Get current values of evidence
            # 2. Check if event link is still valid (using 5 tuple combination)
            # 2.a if event link is valid, just update the fields in evidence table
            # 2.b if not, check if already event exists, else create new event
            # 3. update even_id in update fields if link is not valid, no need to delete dangling events
            # 4. update evidence information

            evidence_before_update = get_table_data('evidence',
                                                    filter_dict={
                                                        'id': arg_dict.get('id')
                                                    })

            # Check if event_id needs to be updated
            event_composite_keys = ['country','date','restriction','type', 'value']

            event_data = {}
            event_id_update_bool = False
            new_event_created = False

            for key in event_composite_keys:
                event_data[key] = arg_dict.get(key, evidence_before_update[0][key])
                if (key in arg_dict.keys()) and arg_dict.get(key) != evidence_before_update[0][key]:
                    event_id_update_bool = True

            data_to_update = {
                'id': arg_dict['id'],  ## TODO: check for sql injection
            }

            if event_id_update_bool:
                matched_event, matched_evidences = get_event(   event_data['type'], \
                                                                event_data['country'], \
                                                                event_data['date'], \
                                                                event_data['value'], \
                                                                event_data['restriction'], \
                                                                get_evidences = False     # Not implemented
                                                                )

                # If event id needs to be updated, then create new event or reuse previously created event
                if len(matched_event)>0:
                    data_to_update['even_id'] = matched_event[0]['even_id']
                else:
                    new_event_uuid = create_event(type=event_data['type'],
                                                  country=event_data['country'],
                                                  date=event_data['date'],
                                                  value=event_data['value'],
                                                  restriction=event_data['restriction']
                                                  )
                    data_to_update['even_id'] = new_event_uuid
                    new_event_created = True

            # update evidence table
            update_fields =    ['anno_id', \
                                'anno_provided_url', \
                                'approx_date_bool', \
                                'country',
                                'date',
                                'citation_url',
                                'fine_grained_location',
                                'restriction',
                                'type',
                                'value',
                                'other_value']

            for update_field in update_fields:
                if arg_dict.get(update_field) and arg_dict.get(update_field) != evidence_before_update[0][update_field]:
                    data_to_update[update_field] = arg_dict.get(update_field)

            updated_data, status = update_to_table(table_name='evidence',
                                                   table_key='id',
                                                   data_to_update=data_to_update
                                                   )

            return jsonify({ "evidence": updated_data[0],
                             "even_id_updated": event_id_update_bool,
                             "new_event": new_event_created
                             }) , status

    if request.method == 'GET':

        ## GET call
        filter_dict = dict()
        if 'id' in arg_dict.keys():
            filter_dict['id'] = arg_dict['id']


        # eg. /evidence?restriction=1&country=USA-MA&type=school%20closure&value=Universities%20closed
        filtering_keys = ['id','date','country','type','value','restriction']
        for filter in arg_dict.keys():
            if filter in filtering_keys:
                filter_dict[filter] = arg_dict[filter]



        result = get_table_data('evidence',
                                filter_dict=filter_dict,
                                limit=arg_dict.get('limit',20),
                                offset=arg_dict.get('offset',0),
                                orderby_dict = {
                                    'even_id': 'asc',
                                    'id': 'asc'
                                }
                                )

        # To make it backward compatible
        if 'id' in arg_dict.keys():
            evidence = result[0] if len(result)>0 else {}
        else:
            evidence = {'evidences': result}

        return jsonify(evidence) , 200


@app.route('/event', methods=['GET'])
def get_event_resource():
    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if 'id' not in arg_dict.keys():
        return "id is a required field", 400

    matched_evidences = get_table_data('evidence',
                                       filter_dict={
                                           'even_id': arg_dict['id']
                                       },
                                       orderby_dict={
                                           'id': 'asc'
                                       })

    matched_event = get_table_data('event',
                                   filter_dict={
                                       'even_id': arg_dict['id']
                                   })

    return jsonify({
        'match_found': "true" if len(matched_event) > 0 else "false",
        'evidences': matched_evidences,
        'event': matched_event[0] if len(matched_event) > 0 else {},
    }), 200


@app.route('/event', methods=['POST'])
def event():
    """
    Call this api to promote candidate evidence to event. GET on event with even_id is not implemented yet.
    ---
    tags:
      - event
    parameters:
      - name: sessionKey
        in: query
        type: string
        description: session key
      - name: evid_id
        in: query
        type: string
        description: session key
      - name: promote
        in: query
        type: boolean
        default: true
    responses:
      404:
        description: You landed in unknown territory..Please social distance yourself from such endpoints
      200:
        description: Event
        schema:
          id: event
          properties:
            event_created:
                type: boolean
                description: true
            even_id:
                type: string
                format: uuid
                description: newly created even_id
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if ('evid_id' not in arg_dict) or  ('promote' not in arg_dict):
        return 'evid_id and promote are a required field, even_id lookup is not implemented yet.', 400
    else:
        candidate_data = get_table_data('candidateevidence',
                                        filter_dict={
                                            'evid_id': arg_dict['evid_id']
                                        })

    if len("candidate_data")==0:
        return 'No matching Candidate Evidence to promote'
    else:
        candidate_data  = candidate_data[0]
        # We wish to validate that there is no match already, we should not be create a previous Event
        matched_event, matched_evidences  = get_event(type=candidate_data['type'],
                                                      country=candidate_data['country'],
                                                      date=candidate_data['date'],
                                                      value=candidate_data['value'],
                                                      restriction=candidate_data['restriction']
                                                      )
        if len(matched_event)>0:
            return f"There is already a matching event, you should not be promoting CandidateEvidence: {arg_dict['evid_id']} to Event" , 500
        else:
            ##TODO: Fix this event_uuid thing, clash
            # event_uuid = str(uuid.uuid3(uuid.NAMESPACE_DNS,string_key_to_hash))
            event_uuid = str(uuid.uuid1())  # 3(uuid.NAMESPACE_DNS,string_key_to_hash))

            event_table_fields_to_copy = ['type', 'country', 'date', 'value', 'level_of_enforcement',
                                          'level_of_confidence', 'restriction']

            event_dict = {}
            event_dict['even_id'] = event_uuid

            for field in event_table_fields_to_copy:
                if candidate_data[field] != 'None':
                    event_dict[field] = candidate_data[field]

            event_table_updated = insert_to_table(
                table_name='event',
                data=event_dict
            )

            ##  Update Evidence table
            # copy Row from CandidateEvidence row to  Evidence table

            if event_table_updated:

                evidence_table_updated , evidence_updated = add_to_evidence(candidate_data=candidate_data,
                                                                            event_id= event_uuid,
                                                                            check_to_update=True,
                                                                            anno_id = request.args.get('sessionKey', 0)
                                                                            )
                return jsonify({
                    "event_created": "true",
                    "even_id":  event_uuid
                }), 200


    return 'some error' , 500


@app.route('/documentContext', methods=['GET'])
def document_context():
    """
    Call this api to get sentences near sent_id.
    ---
    tags:
      - document
    parameters:
      - name: sent_id
        in: query
        type: string
        description: wiki or similar page
      - name: sentences_before_offset
        in: query
        type: string
      - name: sentences_after_offset
        in: query
        type: string
      - name: text_only
        in: query
        type: string
    responses:
      404:
        description: You landed in unknown territory..Please social distance yourself from such endpoints
      200:
        description: Event
        schema:
          id: event
          properties:
            candidateEvidence:
                type: string
                description: rows for candidateRows matching the criteria
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if 'sent_id' not in arg_dict:
        return 'sent_id is required field', 400

    result , status = document_context_by_offset(sent_id=arg_dict['sent_id'],
                                                 sentences_before_offset=arg_dict.get('sentences_before_offset',5),
                                                 sentences_after_offset=arg_dict.get('sentences_after_offset',5)
                                                 )

    if ('text_only' in arg_dict ) and (status==200):
        text = [x['text'] for x in result]
        text = ' '.join(text)

        return jsonify(text), 200

    return jsonify(result), status


@app.route('/eventType')
def eventtype():
    """
    Call this api to get event type
    ---
    tags:
      - eventType
    parameters:
      - name: q
        in: query
        type: string
        default: ''
        description: Filter event type
    responses:
      404:
        description: You landed in unknown territory..Please social distance yourself from such endpoints
      200:
        description: EventType
        schema:
          id: EventType
          properties:
            eventType:
                type: string
                default: changes in prison-related policies
            valueType:
                type: string
                default: Integer
            cat0:
                type: string
            cat1:
                type: string
            cat2:
                type: string
            cat3:
                type: string
            cat4:
                type: string
            cat5:
                type: string
    """
    search_term = request.args.get('q', '')
    return jsonify(search_eventtype())


@app.route('/geo')
def geo():
    """
    Call this api to get geo location
    ---
    tags:
      - geo
    parameters:
      - name: q
        in: query
        type: string
        default: ''
        description: Filter on state
    responses:
      404:
        description: You landed in unknown territory..Please social distance yourself from such endpoints
      200:
        description: EventType
        schema:
          id: Geo
          properties:
            Country:
                type: string
                default: United States
            State:
                type: string
                default: Massachusetts
            Code:
                type: string
                default: USA-MA

    """
    search_term = request.args.get('q', '')
    return jsonify(search_country(search_term=search_term))


@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404


if __name__ == '__main__':
    app = Flask(__name__, static_folder='../frontend')
    CORS(app)
