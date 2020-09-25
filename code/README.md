# Worldwide Non-pharmaceutical Interventions Tracker for COVID19 (WNTRAC) Automated NPI Curation System.

The architecture of the system is described in our paper: https://arxiv.org/abs/2009.07057. To run the natural language processing (NLP) pipeline, execute the Jupyter notebook located [here](pipeline/WNTRAC-models-demo.ipynb) by following the steps below.

1. Check out the repository
```bash
   $ git clone https://github.com/IBM/wntrac.git ; cd wntrac/code/pipeline
```

2. Create a virtual environment with Conda
```bash
    $ conda create -n wntrac
```

3. Activate the new environment
```bash
    $ conda activate wntrac
```

4. Run the Jupyter notebook
```bash
    $ jupyter notebook WNTRAC-models-demo.ipynb
```

5. Change the kernal used by the notebook instance: select the "wntrac" from Kernel option. (`jupyter -> kernel -> change kernel -> wntrac`)

6. Run the entire notebook.
