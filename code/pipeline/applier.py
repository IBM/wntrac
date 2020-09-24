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

import os,sys
import pandas as pd
import torch
from simpletransformers.classification import ClassificationModel
from torch.autograd import Variable
import numpy as np
import pickle
from utils.wikidata_utils import *
from utils.applier_utils import *
import statistics
import uuid
from utils.type_mapper import type_map
from utils.fine_grained_classifier import FineGrainedClassifier
from utils.common_utils import get_docid

class Applier:
    def __init__(self,dir_path, model_path, resources_path, use_cuda, debugging=False):
        self.dir_path = dir_path
        self.model_path = model_path
        self.resources_path = resources_path
        self.debugging = debugging
        self.mapper = FineGrainedClassifier(self.resources_path)
        if os.path.exists(model_path) is False:
            print('Model Path not found!')
            return
        #initializing models
        bert_model_path = os.path.join(model_path, "bert_model")
        self.bert_model = ClassificationModel('bert', bert_model_path , use_cuda=use_cuda,
                                    args={'from_tf': False})
        print("Initialized BERT model")
        self.svm_est_model = pickle.load(open(os.path.join(model_path, 'svm_estimator.sav'), 'rb'))
        print("Initialized SVM model.")
        self.lr_model = pickle.load(open(os.path.join(model_path, 'lr.sav'), 'rb'))
        print("Initialized LR model.")

    def _predict_bert(self, df):
        predictions, raw_outputs = self.bert_model.predict(np.asarray(df['text']))
        labels = ['confinement', 'economy', 'gatheringrestriction', 'misc', 'serviceorplaceclosed', 'stateofemergency',
                  'tracing', 'travelrestrictions', 'unk']
        probs = []
        for i in range(0, len(raw_outputs)):
            probs.append((torch.nn.functional.softmax(Variable(torch.from_numpy(raw_outputs[i])))).numpy())
        df['prediction'] = predictions
        df['prediction_BERT'] = df.apply(lambda row: labels[row['prediction']], axis=1)
        df['conf_BERT'] = df.apply(lambda row: probs[row.name][row['prediction']], axis=1)
        df.drop('prediction', axis=1)

    def _predict_others(self, df):
        add_clean_text(df)
        apply_confidence(df, model=self.svm_est_model, name='LINEAR_SVM_ESTIMATOR')
        apply_confidence(df, model=self.lr_model, name='LOGISTIC_REGRESSION')

    def _generate_evid_id(self):
        return uuid.uuid4()

    def _get_mode_val_conf(self, val1, val2, val3, conf1, conf2, conf3, return_val):
        try:
            val = statistics.mode([val1, val2, val3])
            conf = statistics.mean([conf1, conf2, conf3])
        except:
            val = val1
            conf = conf1
        if return_val:
            return val
        else:
            return conf

    def _predict_type(self, df):
        if os.path.exists(self.model_path) is False:
            df['level_of_confidence'] =""
            df['type'] =""
            df['value'] = ""
            df['level_of_enforcement'] = ""
            df['restriction'] = ""
        else:
            self._predict_bert(df)
            self._predict_others(df)
            df['type'] = df.apply(lambda row:self._get_mode_val_conf(row['prediction_BERT'], row['prediction_LINEAR_SVM_ESTIMATOR'], row['prediction_LOGISTIC_REGRESSION'], row['conf_BERT'], row['conf_LINEAR_SVM_ESTIMATOR'],  row['conf_LOGISTIC_REGRESSION'], True), axis=1)
            df['level_of_confidence'] = df.apply(lambda row:self._get_mode_val_conf(row['prediction_BERT'], row['prediction_LINEAR_SVM_ESTIMATOR'], row['prediction_LOGISTIC_REGRESSION'], row['conf_BERT'], row['conf_LINEAR_SVM_ESTIMATOR'], row['conf_LOGISTIC_REGRESSION'], False), axis=1)
            print ("Event Type Prediction complete, starting fine-grained event value prediction")
            df = self._predict_type_values(df)
            return df

    def _predict_type_values(self, df):
        df['value'] = ""
        df = self.mapper.leaf_node_mapper(df)
        df['level_of_enforcement'] = ""
        df['restriction'] = ""
        return df

    def _remove_other_types(self,df):
        return df.loc[df['type'].isin(type_map.values())]