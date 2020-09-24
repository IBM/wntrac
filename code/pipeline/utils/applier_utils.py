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

import nltk
from nltk.corpus import stopwords
import re
import pandas as pd
import os

def num_tokens(df, colname):
    return df[colname].apply(lambda x: len(x.split(' '))).sum()

REPLACE_BY_SPACE_RE = re.compile('[/(){}\[\]\|@,;]')
BAD_SYMBOLS_RE = re.compile('[^0-9a-z #+_]')
STOPWORDS = set(stopwords.words('english'))


def get_metadata(crawl_dir):
    df = pd.read_csv(os.path.join(crawl_dir, 'metadata.csv'))
    return df['crawl_id'].iloc[0], df['crawl_date'].iloc[0]


def _clean_text(text):
    text = text.lower()  # lowercase text
    text = REPLACE_BY_SPACE_RE.sub(' ', text)  # replace REPLACE_BY_SPACE_RE symbols by space in text
    text = BAD_SYMBOLS_RE.sub('', text)  # delete symbols which are in BAD_SYMBOLS_RE from text
    text = ' '.join(word for word in text.split() if word not in STOPWORDS)  # delete stopwors from text
    return text

def add_clean_text(df):
    df['cleanText'] = df['text'].apply(_clean_text)

### Applier (With & Without confidence)

def apply_confidence(df, model, name):
    X_test = df['cleanText']
    y_pred = model.predict(X_test)
    y_pred_conf = model.predict_proba(X_test)
    assert len(X_test) == len(y_pred), "Invalid data"
    predictions = []
    confidences = []
    for i in range(len(X_test)):
        inst_pred = y_pred[i]
        confidence = max(y_pred_conf[i])
        max_ind = list(y_pred_conf[i]).index(confidence)
        conf_class = list(model.classes_)[max_ind]
        assert inst_pred == conf_class, "Invalid =" + str(y_pred_conf[i]) + ";" + str(max_ind) + ";" + str(
            inst_pred)
        if '===' in X_test[i] or '===' in df.iloc[i]['text'] or df.iloc[i]['text'].startswith('Section::::') or df.iloc[i]['text'].startswith("BULLET::::"):
            inst_pred = 'unk'
        predictions.append(inst_pred)
        confidences.append(round(confidence, 3))
    df['prediction_'+name] = predictions
    df['conf_' + name] = confidences
