import pandas as pd
import numpy as np
import random

class docking():
    def __init__(self,input_pro,ligand):
        self.input_pro=input_pro
        self.rcsb_id=self.input_pro['RCSB ID']
        self.ligand=ligand

    def docker(self):
        all_ligand_data = []

        for ligand_name in self.ligand:
            # Generate random Binding Energy (negative float)
            # Using round to keep the numbers readable, e.g., -10.5, -8.7
            binding_energy = round(random.uniform(-20.0, -5.0), 2)

            # Generate random RMSD (positive float, typically small)
            rmsd = round(random.uniform(0.5, 3.0), 2)

            # Generate modes data (9 modes, negative floats)
            modes_data = {}
            for i in range(1, 10):  # From mode_1 to mode_9
                mode_key = f'mode_{i}'
                # Using round for mode values as well
                modes_data[mode_key] = round(random.uniform(-15.0, -3.0), 2)

            # Construct the dictionary for the current ligand
            ligand_dict = {
                'ligand_name': ligand_name,
                'Binding Energy': binding_energy,
                'RMSD': rmsd,
                'modes': modes_data
            }
            all_ligand_data.append(ligand_dict)

        return {'RCSB ID':self.input_pro['RCSB ID'],'docking':all_ligand_data}


input_pro= {'RCSB ID':'6W41','Protein':'SARS-CoV-2 Spike Glycoprotein','Method':'Electron Microscopy','Resolution':'2.80 Å','Organism':'Severe acute respiratory syndrome coronavirus 2','Sidechains':'2905'}
ligand=['CC(=O)OC1=CC=CC=C1C(=O)O','CC(C)CC1=CC=C(C=C1)C(C)C(=O)O','CC(=O)NC1=CC=C(C=C1)O','CN1C=NC2=C1C(=O)N(C(=O)N2C)C','C1=CC(=C(C=C1F)Cl)NC2=C3C=C(C=CC3=NC=N2)OCCCN4CCOCC4','CN(C)CC1=C(C=C(C=C1)NC2=NC=C(C(=N2)C3=CN(C=C3)C)C)NC(=O)C=C']

doc=docking(input_pro,ligand)
print(doc.docker())
# Result {'RCSB ID': '6W41', 'docking': [{'ligand_name': 'CC(=O)OC1=CC=CC=C1C(=O)O', 'Binding Energy': -15.91, 'RMSD': 2.73, 'modes': {'mode_1': -3.68, 'mode_2': -6.53, 'mode_3': -14.93, 'mode_4': -4.29, 'mode_5': -7.76, 'mode_6': -7.35, 'mode_7': -14.41, 'mode_8': -9.37, 'mode_9': -10.82}}, {'ligand_name': 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', 'Binding Energy': -10.46, 'RMSD': 2.95, 'modes': {'mode_1': -6.23, 'mode_2': -7.18, 'mode_3': -6.48, 'mode_4': -8.03, 'mode_5': -8.99, 'mode_6': -3.1, 'mode_7': -9.97, 'mode_8': -4.36, 'mode_9': -8.91}}, {'ligand_name': 'CC(=O)NC1=CC=C(C=C1)O', 'Binding Energy': -11.27, 'RMSD': 1.26, 'modes': {'mode_1': -11.0, 'mode_2': -7.03, 'mode_3': -11.48, 'mode_4': -8.77, 'mode_5': -12.22, 'mode_6': -13.89, 'mode_7': -5.79, 'mode_8': -6.8, 'mode_9': -12.92}}, {'ligand_name': 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', 'Binding Energy': -15.85, 'RMSD': 1.01, 'modes': {'mode_1': -4.25, 'mode_2': -4.06, 'mode_3': -9.62, 'mode_4': -3.28, 'mode_5': -9.2, 'mode_6': -11.43, 'mode_7': -7.5, 'mode_8': -13.43, 'mode_9': -8.45}}, {'ligand_name': 'C1=CC(=C(C=C1F)Cl)NC2=C3C=C(C=CC3=NC=N2)OCCCN4CCOCC4', 'Binding Energy': -9.08, 'RMSD': 2.43, 'modes': {'mode_1': -5.32, 'mode_2': -10.25, 'mode_3': -13.97, 'mode_4': -13.93, 'mode_5': -10.33, 'mode_6': -13.37, 'mode_7': -10.44, 'mode_8': -10.5, 'mode_9': -9.59}}, {'ligand_name': 'CN(C)CC1=C(C=C(C=C1)NC2=NC=C(C(=N2)C3=CN(C=C3)C)C)NC(=O)C=C', 'Binding Energy': -17.9, 'RMSD': 0.73, 'modes': {'mode_1': -9.62, 'mode_2': -9.29, 'mode_3': -9.53, 'mode_4': -11.86, 'mode_5': -12.13, 'mode_6': -14.81, 'mode_7': -12.45, 'mode_8': -3.89, 'mode_9': -10.43}}]}
