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
import ibm_boto3
from ibm_botocore.client import Config
import pandas as pd

basedir = os.path.abspath(os.path.dirname(__file__))

s3_client = ibm_boto3.client(service_name='s3',
    ibm_api_key_id=  os.environ.get('API_KEY', None)  ,
    ibm_auth_endpoint="https://iam.ng.bluemix.net/oidc/token",
    config=Config(signature_version='oauth'),
    endpoint_url= 'https://s3-api.us-geo.objectstorage.softlayer.net'
)

bucket= os.environ.get('BUCKET_NAME')