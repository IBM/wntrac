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

import sqlalchemy as db
import os
import pandas as pd
from config import *

import sqlalchemy.dialects.postgresql as db_dialect


def query_to_result_dict(query, connection):
    # Generic function to get result of a query
    ResultProxy = connection.execute(query)
    ResultSet = ResultProxy.fetchall()

    result = []
    for i in range(len(ResultSet)):
        result.append(dict(zip(ResultProxy.keys(), [str(val) for val in ResultSet[i]])))
        ResultProxy.close()

    return result


def get_table_data(table_name, filter_dict=None, limit=20, offset=0, random=False, orderby_dict=None):
    '''
    :param table_name:
    :param filter_dict:
    :param limit:
    :param offset:
    :param random:
    :param orderby_dict: Order by dict works if random = False , eg. { 'last_updated': 'desc' } , o
    :return:
    '''
    # Generic function to get table data and perform basic filtering, limit, offset, etc
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        db_table = db.Table(table_name, metadata, autoload=True, autoload_with=engine)
        query = db.select([db_table])

        if filter_dict:
            for key in filter_dict.keys():
                query = query.where(db_table.c[key] == filter_dict[key])
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)

        if orderby_dict and not random:
            for key in orderby_dict.keys():
                if orderby_dict[key] == 'asc':
                    query = query.order_by(db_table.c[key])
                if orderby_dict[key] == 'desc':
                    query = query.order_by(db.desc(db_table.c[key]))

        ResultProxy = connection.execute(query)
        ResultSet = ResultProxy.fetchall()
        result = []
        for i in range(len(ResultSet)):
            result.append(dict(zip(ResultProxy.keys(), [str(val) for val in ResultSet[i]])))

        ResultProxy.close()
        connection.close()
        engine.dispose()

        return result


def update_to_table(table_name, table_key, data_to_update):
    # Generic function to update to a table

    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        CandidateEvidence = db.Table(table_name, metadata, autoload=True, autoload_with=engine)

        query = CandidateEvidence.update(). \
            where(CandidateEvidence.c[table_key] == data_to_update[table_key]). \
            values(data_to_update)
        try:
            ResultProxy = connection.execute(query)
        except Exception as e:
            return str(e), 400

        query = CandidateEvidence.select(). \
            where(CandidateEvidence.c[table_key] == data_to_update[table_key])
        try:
            ResultProxy = connection.execute(query)
            ResultSet = ResultProxy.fetchall()
        except Exception as e:
            return str(e), 400

        result = []
        for i in range(len(ResultSet)):
            result.append(dict(zip(ResultProxy.keys(), [str(val) for val in ResultSet[i]])))

        ResultProxy.close()

        connection.close()
        engine.dispose()

        return result, 200


def insert_to_table(table_name, data):
    # Generic function to insert to a table
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        db_table = db.Table(table_name, metadata, autoload=True, autoload_with=engine)

        insert_stmt = db_dialect.insert(db_table).values(data)

        ResultProxy = connection.execute(insert_stmt)

        connection.close()
        engine.dispose()

    return True


def random_unassigned_document():
    # Function to assign a document to a user who needs to be assigned. It also deletes all stale assignments
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        CandidateEvidence = db.Table('candidateevidence', metadata, autoload=True, autoload_with=engine)
        Evidence = db.Table('evidence', metadata, autoload=True, autoload_with=engine)
        sentence_context = db.Table('sentencecontext', metadata, autoload=True, autoload_with=engine)
        annotatorassignment = db.Table('annotatorassignment', metadata, autoload=True, autoload_with=engine)

        ## Delete all stale assignments;
        query_str = '''
                    DELETE from wwcc.annotatorassignment  
                    WHERE last_updated < NOW() - INTERVAL '24 HOURS';
                '''
        ResultProxy = engine.execute(query_str)

        ## get country which has atleast one non-discarded candidateEvidence which is not in evidence
        query = db.select([CandidateEvidence.c.doc_url]).where(
            ~db.exists().where(CandidateEvidence.c.evid_id == Evidence.c.evid_id)
        ).where(CandidateEvidence.c.discard.isnot(True)  ## TODO: fix this to discard !=1
                ).where(
            ~db.exists().where(CandidateEvidence.c.doc_url == annotatorassignment.c.doc_url)
        ).limit(1)

        result = query_to_result_dict(query, connection)

        if len(result) == 0:
            return 'No more candidate evidence to verify', 200
        else:
            ## update that country to annotator
            doc_url = result[0]['doc_url']

        connection.close()
        engine.dispose()

        return doc_url, 200


def unassosiated_evidence(filter_dict=None, limit=20, offset=0, random=True, mode='random', anno_id=None):
    # Function to get unassociated evidence using different modes
    # '''
    #     type of modes
    #         - random: returns random candidate evidence
    #         - same_country : returns candidate evidence from same_country ordered by offset
    #         - annotator: give the same country till country exhaust
    #     )
    # '''

    if mode == 'same_country':
        # override randommess to false
        random = False

    ## Get the country for which anno_id has submitted before
    if anno_id:
        current_assignments = get_table_data('annotatorassignment',
                                             filter_dict={
                                                 'anno_id': anno_id,
                                             },
                                             orderby_dict={
                                                 'last_updated': 'desc'
                                             },
                                             random=False)

        for current_assignment in current_assignments:
            unassigned = _unassociated_candidateevidence(current_assignment['doc_url'],
                                                         filter_dict, limit, offset, random)
            if len(unassigned) > 0:
                return unassigned

        else:
            doc_url, status = random_unassigned_document()
            if anno_id:
                engine = db.create_engine(
                    os.environ.get('DB_URI', None))
                with engine.connect() as connection:
                    ## Delete all stale assignments for this user;
                    query_str = f'''
                                DELETE from wwcc.annotatorassignment  
                                WHERE  anno_id='{anno_id}';
                            '''
                    ResultProxy = engine.execute(query_str)

                    connection.close()
                    engine.dispose()

                insert_to_table('annotatorassignment', {
                    'anno_id': anno_id,
                    'doc_url': doc_url,
                    'last_updated': 'NOW()'
                })
        unassigned = _unassociated_candidateevidence(doc_url, filter_dict, limit, offset, random)

    return unassigned


def _unassociated_candidateevidence(doc_url, filter_dict=None, limit=20, offset=0, random=True, mode=''):
    # Function to get unassociated candidate evidence using different modes

    engine = db.create_engine(os.environ.get('DB_URI', None))  # TODO: Fix with pooling

    with engine.connect() as connection:
        metadata = db.MetaData()
        CandidateEvidence = db.Table('candidateevidence', metadata, autoload=True, autoload_with=engine)
        Evidence = db.Table('evidence', metadata, autoload=True, autoload_with=engine)
        sentence_context = db.Table('sentencecontext', metadata, autoload=True, autoload_with=engine)

        query = db.select([CandidateEvidence, sentence_context]
                          ).select_from(CandidateEvidence.join(
            sentence_context,
            CandidateEvidence.c.sent_id == sentence_context.c.sent_id,
            isouter=True
        )).where(
            ~db.exists().where(CandidateEvidence.c.evid_id == Evidence.c.evid_id)
        ).where(CandidateEvidence.c.doc_url == doc_url
                ).where(CandidateEvidence.c.discard.isnot(True)  ## TODO: fix this to discard !=1
                        ).order_by(
            CandidateEvidence.c.doc_url
        ).order_by(
            CandidateEvidence.c.begin_offset
        )

        result = query_to_result_dict(query, connection)

        if filter_dict:
            for key in filter_dict.keys():
                query = query.where(CandidateEvidence.c[key] == filter_dict[key])
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)

        ResultProxy = connection.execute(query)
        ResultSet = ResultProxy.fetchall()

        result = []
        for i in range(len(ResultSet)):
            result.append(dict(zip(ResultProxy.keys(), [str(val) for val in ResultSet[i]])))

        ResultProxy.close()

        connection.close()
        engine.dispose()

    return result


def get_event(type, country, date, value, restriction, get_evidences=False):
    # Get an event based filtered on provided params
    '''
    :param type:
    :param country:
    :param date:
    :param value:
    :return:
    '''
    '''
        select * 
        from CandidateEvidence ec,  Evidence
        e
        where 
        e.type  = ec.type and 
        e.country = ec.country  and  
        e.date  = ec.date and 
        e.value = ec.value
    '''

    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        CandidateEvidence = db.Table('candidateevidence', metadata, autoload=True, autoload_with=engine)
        Event = db.Table('event', metadata, autoload=True, autoload_with=engine)

        query = db.select([Event]).where(
            Event.c.type == type
        ).where(
            Event.c.country == country
        ).where(
            Event.c.date == (date if date != 'None' else None)
        ).where(
            Event.c.value == value
        ).where(
            Event.c.restriction == (restriction if restriction != 'None' else None)
        )

        try:

            result = query_to_result_dict(query, connection)

            if len(result) > 0:
                matched_evidences = get_table_data(
                    table_name='evidence',
                    filter_dict={
                        'even_id': result[0]['even_id']
                    },
                    orderby_dict={
                        'id': 'asc'
                    }
                )
            else:
                matched_evidences = []

        except:
            print("unable to print real sql query")


        finally:
            connection.close()
            engine.dispose()

    return result, matched_evidences


def add_to_evidence(candidate_data, event_id, check_to_update=False, anno_id=''):
    '''
    :param evidence_id:
    :param event_id:
    :return:
    '''
    # Adding new value to the evidence. It takes care of clashes based on business logic

    evidence_dict = {}
    evidence_dict['even_id'] = event_id

    for field in evidence_and_CandidateEvidence_overlap:
        if candidate_data[field] != 'None':
            evidence_dict[field] = candidate_data[field]

    evidence_dict['anno_id'] = anno_id

    update_evidence = True

    if check_to_update:
        engine = db.create_engine(os.environ.get('DB_URI', None))
        with engine.connect() as connection:
            # TODO: take care of sql injection
            query_str = f'''
                                select * 
                                from evidence e 
                                where 
                                    (e.even_id = '{event_id}') and
                                    (e.evid_id = '{candidate_data['evid_id']}') and 
                                    (e.sent_id = '{candidate_data['sent_id']}') and 
                                    (e.doc_url = '{candidate_data['doc_url']}') and 
                                    (e.crawl_id = '{candidate_data['crawl_id']}') and 
                                    (e.crawl_date = '{candidate_data['crawl_date']}')  and 
                                    (e.begin_offset = {candidate_data['begin_offset']}) and 
                                    (e.end_offset = {candidate_data['end_offset']}) and 
                                    (e.citation_url = '{candidate_data['citation_url'].replace("'", "''").replace("%",
                                                                                                                  "%%")}') and 
                                    (e.anno_provided_url ='{candidate_data['anno_provided_url'].replace("'",
                                                                                                        "''").replace(
                "%", "%%")}') and 
                                    (e.fine_grained_location ='{candidate_data['fine_grained_location'].replace("'",
                                                                                                                "''").replace(
                "%", "%%")}') and 
                                    (e.type ='{candidate_data['type']}') and 
                                    (e.country ='{candidate_data['country'].replace("'", "''").replace("%",
                                                                                                       "%%")}') and 
                                    (e.date ='{candidate_data['date']}') and 
                                    (e.value ='{candidate_data['value'].replace("'", "''").replace("%", "%%")}') and 
                                    (e.other_value ='{candidate_data['other_value'].replace("'", "''").replace("%",
                                                                                                               "%%")}') and 
                                    (e.level_of_enforcement ='{candidate_data['level_of_enforcement'].replace("'",
                                                                                                              "''").replace(
                "%", "%%")}') and 
                                    (e.level_of_confidence ='{candidate_data['level_of_confidence'].replace("'",
                                                                                                            "''").replace(
                "%", "%%")}') and 
                                    (e.restriction ='{candidate_data['restriction']}')

                    '''
            ResultProxy = engine.execute(query_str)
            ResultSet = ResultProxy.fetchall()

            if len(ResultSet) > 0:
                update_evidence = False

            connection.close()
            engine.dispose()

    if update_evidence:
        evidence_table_data = insert_to_table(
            table_name='evidence',
            data=evidence_dict
        )

        return evidence_table_data, update_evidence
    else:
        return evidence_dict, update_evidence


def addNewValue(table_name, type, newValue, tags=False, official=False):
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        db_table = db.Table(table_name, metadata, autoload=True, autoload_with=engine)
        if not tags:
            query = f'''INSERT into wwcc.eventvalue (eventtype_id, value, official_value) 
            VALUES ((select eventtype_id from wwcc.eventtype where type = '{type}'), '{newValue}', {official})
            ON CONFLICT DO NOTHING'''
        else:
            tags = newValue.split(",")
            entries = []
            query = "INSERT into wwcc.eventvalue (eventtype_id, value, official_value)\nVALUES"
            for tag in tags:
                entries.append(
                    f'''((select eventtype_id from wwcc.eventtype where type = '{type}'), '{tag}', {official})''')
            query = query + ", \n".join(entries) + "\n"
            query = query + '''ON CONFLICT DO NOTHING'''

        ResultProxy = connection.execute(query)

        connection.close()
        engine.dispose()

    return True


def search_eventtype():
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        metadata = db.MetaData()
        eventtype = db.Table('eventtype', metadata, autoload=True, autoload_with=engine)
        eventvalue = db.Table('eventvalue', metadata, autoload=True, autoload_with=engine)

        query = db.select([eventtype.c.eventtype_id, eventtype.c.type, eventtype.c.official_type,
                           eventtype.c.data_type, eventtype.c.integerstring, eventvalue.c.id, eventvalue.c.value,
                           eventvalue.c.official_value]).select_from(
            eventtype.join(eventvalue, eventtype.c.eventtype_id == eventvalue.c.eventtype_id, isouter=True)
        )
        query = query.order_by(eventtype.c.eventtype_id, eventvalue.c.official_value.desc(), eventvalue.c.id)

        ResultProxy = connection.execute(query)
        ResultSet = ResultProxy.fetchall()
        result = []
        for i in range(len(ResultSet)):
            result.append(dict(zip(ResultProxy.keys(), [str(val) for val in ResultSet[i]])))

        ResultProxy.close()
        connection.close()
        engine.dispose()

        return result


geo = pd.read_csv("resources/iso_codes.v7.txt")
geo = geo.applymap(lambda x: '' if str(x) == 'nan' else x)


def search_country(search_term=''):
    filtered = geo[
        (geo['code'].apply(lambda x: search_term in str(x).lower() if x else False)) | (
            geo['country'].apply(lambda x: search_term in str(x).lower() if x else False)) | (
            geo['URL'].apply(lambda x: search_term in str(x).lower() if x else False))] if len(search_term) > 0 else geo

    return filtered.to_dict(orient='records')


def document_context_by_offset(sent_id=None, sentences_before_offset=5, sentences_after_offset=5):
    engine = db.create_engine(os.environ.get('DB_URI', None))

    with engine.connect() as connection:
        metadata = db.MetaData()
        CandidateEvidence = db.Table('candidateevidence', metadata, autoload=True, autoload_with=engine)

        query = db.select([CandidateEvidence]
                          ).where(CandidateEvidence.c.sent_id == sent_id)

        result = query_to_result_dict(query, connection)

        if len(result) < 1:
            return 'sent_id not found', 400

        begin_offset = result[0]['begin_offset']
        doc_url = result[0]['doc_url']
        crawl_id = result[0]['crawl_id']

        # get sentences_before_offset
        query = db.select([CandidateEvidence]
                          ).where(
            CandidateEvidence.c.doc_url == doc_url
        ).where(
            CandidateEvidence.c.crawl_id == crawl_id
        ).where(
            CandidateEvidence.c.begin_offset < begin_offset
        ).order_by(
            db.desc(CandidateEvidence.c.begin_offset)
        ).limit(
            int(sentences_before_offset)
        )

        result = query_to_result_dict(query, connection)[::-1]

        # get sentences_after_offset
        query = db.select([CandidateEvidence]
                          ).where(
            CandidateEvidence.c.doc_url == doc_url
        ).where(
            CandidateEvidence.c.crawl_id == crawl_id
        ).where(
            CandidateEvidence.c.begin_offset >= int(begin_offset)
        ).order_by(
            CandidateEvidence.c.begin_offset
        ).limit(
            sentences_after_offset
        )

        result.extend(query_to_result_dict(query, connection))

        connection.close()
        engine.dispose()

        return result, 200


def get_text(crawl_id, doc_url):
    # Get wiki text which was crawled and process. It should be in data folder
    data_folder = os.environ.get('DATA_FOLDER', 'data')
    doc_name = doc_url.split('title=')[-1].split("&")[0]
    file = f"{data_folder}/crawl_{crawl_id}/doc_{doc_name}.csv"
    return pd.read_csv(file).text[0]


def doc_url_status(doc_url):
    # Read how much of document has been curated so far and retun the statistics
    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        # TODO: take care of sql injection
        results = engine.execute(f'''
                            select(select
                                count(*) as total
                                FROM
                                wwcc.candidateevidence
                                where
                                doc_url = '{doc_url.replace("'", "''")}'
                                ) as total,
                                (
                                    select count( *) as discard
                                FROM
                                wwcc.candidateevidence
                                where
                                doc_url = '{doc_url.replace("'", "''")}'
                                          and discard = '1'
                                ) as discard,
                                (
                                    select count(*) as matching_evidence
                                FROM
                                wwcc.evidence
                                where
                                doc_url = '{doc_url.replace("'", "''")}'
                                ) as matching_evidence
                ''')

        count = results.first()
        result = {k: v for k, v in zip(['total', 'discard', 'matching_evidence'], count)}
        connection.close()
        engine.dispose()

        return result

    return None


def get_softmatch(geo='', old_id=''):
    query_str = f'''
            select *
            from wwcc.evidence
            where country = '{geo.replace("'", "''")}'
            order by date, even_id
            '''

    engine = db.create_engine(os.environ.get('DB_URI', None))
    with engine.connect() as connection:
        result = query_to_result_dict(query_str, connection)
        connection.close()
        engine.dispose()

    return result


evidence_and_CandidateEvidence_overlap = [
    'evid_id',
    'sent_id',
    'doc_url',
    'crawl_id',
    'crawl_date',
    'begin_offset',
    'end_offset',
    'citation_url',
    'fine_grained_location',
    'text',
    'type',
    'country',
    'date',
    'value',
    'other_value',
    'level_of_enforcement',
    'level_of_confidence',
    'restriction',
    'anno_provided_url',
    'approx_date_bool'
]
