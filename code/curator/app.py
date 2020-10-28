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

from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlalchemy as db
from logging import Formatter, FileHandler, INFO
from flask_cors import CORS
import os
from utils import *
import uuid

from config import *

ANGULAR_DIST = "client/dist/wntrac"

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
    Call this api to check association between existing events and candidate evidence
     """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if 'evid_id' not in arg_dict.keys():
        return "evid_id is a required field", 400

    candidate_data = get_table_data('candidateevidence',
                                    filter_dict={
                                        'evid_id': arg_dict['evid_id']
                                    })

    if len(candidate_data) > 0:
        candidate_data = candidate_data[0]
        data_to_update = arg_dict.copy()
        data_to_update.pop('sessionKey', None)

        matched_event, matched_evidences = get_event(type=candidate_data['type'],
                                                     country=candidate_data['country'],
                                                     date=candidate_data['date'],
                                                     value=candidate_data['value'],
                                                     restriction=candidate_data['restriction'],
                                                     get_evidences=True
                                                     )

        return jsonify({
            'match_found': "true" if len(matched_event) > 0 else "false",
            'evidences': matched_evidences,
            'candidate_evidence': candidate_data,
            'event': matched_event[0] if len(matched_event) > 0 else {},
        }), 200

    else:
        return jsonify(f"CandidateEvidence with id: {arg_dict['evid_id']} was not found"), 500


@app.route('/candidateEvidence', methods=['GET', 'POST'])
def CandidateEvidence(filter_dict=dict(), limit=50, offset=0):
    """
    Api to get / update candidateEvidence
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if request.method == 'POST':

        if 'evid_id' not in arg_dict.keys():
            return "evid_id is a required field", 400

        if request.args.get('discard', False) in ['true', True, 1]:
            ## Going to discard CandidateEvidence,
            updated_data, status = update_to_table(table_name='candidateevidence',
                                                   table_key='evid_id',
                                                   data_to_update={
                                                       'evid_id': arg_dict['evid_id'],  ## TODO: check for sql injection
                                                       'discard': 1
                                                   }
                                                   )
            return jsonify({"updated_data": updated_data[0]}), status

        # Only these columns can be updated / primary key
        update_keys = ['evid_id',  ## required field
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
                       'isNewType',
                       'isNewValue',
                       'valueHasTags'
                       ]

        for key in arg_dict.keys():
            if key not in update_keys:
                return f"{key} is not a valid update field.  Only these fields can be updated: { ', '.join(update_keys)}", 400

        candidate_data = get_table_data('candidateevidence',
                                        filter_dict={
                                            'evid_id': arg_dict['evid_id']
                                        })

        if len(candidate_data) > 0:

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

            matched_event, matched_evidences = get_event(type=updated_data[0]['type'],
                                                         country=updated_data[0]['country'],
                                                         date=updated_data[0]['date'],
                                                         value=updated_data[0]['value'],
                                                         restriction=updated_data[0]['restriction'],
                                                         get_evidences=True
                                                         )

            evidence_updated = False

            if len(matched_event) > 0:
                event_id = matched_event[0]["even_id"]

                evidence_table_data, evidence_updated = add_to_evidence(
                    candidate_data=updated_data[0],
                    event_id=event_id,
                    check_to_update=True,
                    anno_id=request.args.get('sessionKey', 0)
                )

            # Promote new value or tags to table
            if ('valueHasTags' in arg_dict and arg_dict['valueHasTags'] == "true" and 'other_value' in arg_dict):
                addNewValue('eventvalue', arg_dict['type'], arg_dict['other_value'], tags=True)

            elif ('isNewValue' in arg_dict and arg_dict['isNewValue'] == "true" and 'other_value' in arg_dict):

                addNewValue('eventvalue', arg_dict['type'], arg_dict['other_value'])

            return jsonify({
                'match_found': "true" if len(matched_event) > 0 else "false",
                'evidence_updated': "true" if evidence_updated else "false",
                'candidate_evidence': updated_data[0],
                'event': matched_event[0] if len(matched_event) > 0 else {},
                'evidences': matched_evidences

            }), 200

        else:
            return jsonify(f"CandidateEvidence with id: {arg_dict['evid_id']} was not found"), 500

    else:

        ## GET call
        limit = request.args.get('limit', limit)
        offset = request.args.get('offset', offset)
        evid_id = request.args.get('evid_id', None)
        unassociated = True if (request.args.get('unassociated', False) in ['true', 'True', '1']) else False
        softmatch = True if (request.args.get('softmatch', False) in ['true', 'True', '1']) else False

        filter_dict = dict()
        if 'evid_id' in arg_dict.keys():
            filter_dict['evid_id'] = arg_dict['evid_id']

        if softmatch:
            geo = request.args.get('geo', None)
            if geo:
                result = get_softmatch(geo=geo)
            else:
                return 403, 'geo is needed to get softmatch'

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


@app.route('/evidence', methods=['GET', 'POST'])
def evidence(filter_dict=dict(), limit=50, offset=0):
    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if request.method == 'POST':

        if 'id' not in arg_dict.keys():
            return "id is a required field", 400

        if request.args.get('delete', False) in ['true', True, 1]:

            updated_data, status = update_to_table(table_name='evidence',
                                                   table_key='id',
                                                   data_to_update={
                                                       'id': arg_dict['id'],  ## TODO: check for sql injection
                                                       'deleted': 1
                                                   }
                                                   )
            return jsonify({"updated_data": updated_data[0]}), status
        else:
            return 'only delete param in POST is supported. In future it will move to DELETE call', 400

    else:

        ## GET call
        evid_id = request.args.get('id', None)

        filter_dict = dict()
        if 'id' in arg_dict.keys():
            filter_dict['id'] = arg_dict['id']

            result = get_table_data('evidence',
                                    filter_dict=filter_dict,
                                    limit=1,
                                    orderby_dict={
                                        'id': 'asc'
                                    },
                                    offset=0),

        else:
            return 'id is required field', 400

        evidence = result[0] if len(result) > 0 else {}

        return jsonify(evidence), 200


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
    Api to promote candidate evidence to event. GET on event with even_id is not implemented yet.
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if ('evid_id' not in arg_dict) or ('promote' not in arg_dict):
        return 'evid_id and promote are a required field, even_id lookup is not implemented yet.', 400
    else:
        candidate_data = get_table_data('candidateevidence',
                                        filter_dict={
                                            'evid_id': arg_dict['evid_id']
                                        })

    if len("candidate_data") == 0:
        return 'No matching Candidate Evidence to promote'
    else:
        candidate_data = candidate_data[0]
        # We wish to validate that there is no match already, we should not be create a previous Event
        matched_event, matched_evidences = get_event(type=candidate_data['type'],
                                                     country=candidate_data['country'],
                                                     date=candidate_data['date'],
                                                     value=candidate_data['value'],
                                                     restriction=candidate_data['restriction']
                                                     )

        if len(matched_event) > 0:
            return f"There is already a matching event, you should not be promoting CandidateEvidence: {arg_dict['evid_id']} to Event", 500
        else:
            event_uuid = str(uuid.uuid1())

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

            if event_table_updated:
                evidence_table_updated, evidence_updated = add_to_evidence(candidate_data=candidate_data,
                                                                           event_id=event_uuid,
                                                                           check_to_update=True,
                                                                           anno_id=request.args.get('sessionKey', 0)
                                                                           )

                return jsonify({
                    "event_created": "true",
                    "even_id": event_uuid
                }), 200

    return 'Internal Server Error', 500


@app.route('/documentContext', methods=['GET'])
def document_context():
    """
    Api to get sentences near sent_id.
    """

    arg_dict = {x[0]: x[1][0] for x in list(request.args.lists())}

    if 'sent_id' not in arg_dict:
        return 'sent_id is required field', 400

    result, status = document_context_by_offset(sent_id=arg_dict['sent_id'],
                                                sentences_before_offset=arg_dict.get('sentences_before_offset', 5),
                                                sentences_after_offset=arg_dict.get('sentences_after_offset', 5)
                                                )

    if ('text_only' in arg_dict) and (status == 200):
        text = [x['text'] for x in result]
        text = ' '.join(text)

        return jsonify(text), 200

    return jsonify(result), status


@app.route('/eventType')
def eventtype():
    """
    Filter on event type
    """
    search_term = request.args.get('q', '')
    return jsonify(search_eventtype())


@app.route('/geo')
def geo():
    """
    Api to get geo location
    """
    search_term = request.args.get('q', '')
    return jsonify(search_country(search_term=search_term))


@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404


if __name__ == '__main__':
    app = Flask(__name__, static_folder='../frontend')
    CORS(app)
