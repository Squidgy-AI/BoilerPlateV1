# vector_store.py
import pandas as pd
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import List, Dict, Optional

class VectorStore:
    def __init__(self):
        # Initialize Qdrant in memory
        self.client = QdrantClient(":memory:")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.collection_name = "conversation_templates"
        
        # Create collection
        self.client.recreate_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=384,  # Vector size for 'all-MiniLM-L6-v2'
                distance=models.Distance.COSINE
            )
        )
    
    def _get_squidgy_response(self, row: pd.Series) -> str:
        """Get Squidgy's response from either column format"""
        if 'As Squidgy' in row and pd.notna(row['As Squidgy']):
            return row['As Squidgy']
        elif 'As Squidgy (Template for Reference)' in row and pd.notna(row['As Squidgy (Template for Reference)']):
            return row['As Squidgy (Template for Reference)']
        return ''
    
    def load_excel_templates(self, excel_content: bytes) -> bool:
        """Load templates from Excel file content"""
        try:
            from io import BytesIO
            df = pd.read_excel(BytesIO(excel_content))
            
            # Verify required columns
            if 'Role' not in df.columns:
                raise ValueError("Excel file must contain 'Role' column")
            
            # Check for either response column
            if 'Clients probable response' not in df.columns:
                raise ValueError("Excel file must contain 'Clients probable response' column")
            
            # Check for either Squidgy column format
            if not ('As Squidgy' in df.columns or 'As Squidgy (Template for Reference)' in df.columns):
                raise ValueError("Excel file must contain either 'As Squidgy' or 'As Squidgy (Template for Reference)' column")
            
            for idx, row in df.iterrows():
                # Get Squidgy's response using helper method
                squidgy_response = self._get_squidgy_response(row)
                
                # Create text representation
                text = f"Role: {row['Role']}\n"
                if pd.notna(row['Clients probable response']):
                    text += f"Client Response: {row['Clients probable response']}\n"
                if squidgy_response:
                    text += f"Template: {squidgy_response}\n"
                
                # Create embedding
                embedding = self.model.encode(text)
                
                # Store in Qdrant
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=[
                        models.PointStruct(
                            id=idx,
                            vector=embedding.tolist(),
                            payload={
                                "role": row['Role'],
                                "client_response": row.get('Clients probable response', ''),
                                "template": squidgy_response,
                                "text": text
                            }
                        )
                    ]
                )
            print(f"Successfully loaded {len(df)} templates")
            return True
            
        except Exception as e:
            print(f"Error loading templates: {str(e)}")
            return False

    def get_role_templates(self, role: str, n_results: int = 3) -> List[Dict]:
        """Get templates for a specific role"""
        query_text = f"Role: {role}"
        query_vector = self.model.encode(query_text)
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=n_results
        )
        
        return [
            {
                "role": hit.payload["role"],
                "client_response": hit.payload["client_response"],
                "template": hit.payload["template"],
                "score": hit.score
            }
            for hit in results
        ]

    def get_all_templates_for_role(self, role: str) -> List[Dict]:
        """Get all templates for a specific role"""
        # Using search instead of scroll for simpler handling
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=self.model.encode(f"Role: {role}"),
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="role",
                        match=models.MatchValue(value=role)
                    )
                ]
            ),
            limit=100  # Increased limit to get all templates
        )
        
        return [
            {
                "role": hit.payload["role"],
                "client_response": hit.payload["client_response"],
                "template": hit.payload["template"]
            }
            for hit in results
        ]

    def find_similar_response(self, client_message: str, n_results: int = 3) -> List[Dict]:
        """Find similar templates based on client message"""
        query_vector = self.model.encode(client_message)
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=n_results
        )
        
        return [
            {
                "role": hit.payload["role"],
                "client_response": hit.payload["client_response"],
                "template": hit.payload["template"],
                "score": hit.score
            }
            for hit in results
        ]