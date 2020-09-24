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

from enum import Enum

class WikidataPropertyID(Enum):
    INSTANCE_OF = "P31"
    SUBCLASS_OF = "P279"
    PART_OF = "P361"
    COUNTRY = "P17"
    POPULATION = "P1082"
    CONTINENT = "P30"
    LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY = "P131"
    SPORT = "P641"
    LOCATION = "P276"
    FACET_OF = "P1269"
    IS_A_LIST_OF = "P360"
    COUNTRY_OF_ORIGIN = "P495"
    ISO_3166_1_ALPHA_3 = "P298"
    ISO_3166_2 = "P300"


class WikidataEntityID(Enum):
    SOVEREIGN_STATE = "Q3624078"
    STATE_OF_UNITED_STATES = "Q35657"
    COUNTRY = "Q6256"
    CONTINENT = "Q5107"
    METROPOLITAN_AREA = "Q1907114"
    CITY = "Q515"
    BIG_CITY = "Q1549591"
    FEDERAL_STATE = "Q43702"
    
# To be used by filter maps:
INST_OF_LOCATIONS = [WikidataEntityID.SOVEREIGN_STATE,WikidataEntityID.STATE_OF_UNITED_STATES,WikidataEntityID.COUNTRY,WikidataEntityID.CONTINENT,WikidataEntityID.METROPOLITAN_AREA,WikidataEntityID.CITY,WikidataEntityID.BIG_CITY,WikidataEntityID.FEDERAL_STATE]