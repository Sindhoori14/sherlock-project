import os
import io
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load MobileNetV2 pre-trained on ImageNet
print("Loading MobileNetV2 model...")
# weights='DEFAULT' is equivalent to weights='IMAGENET1K_V1'
weights = models.MobileNet_V2_Weights.DEFAULT
model = models.mobilenet_v2(weights=weights)

# Remove the classification head (classifier)
# MobileNetV2 structure: features -> avgpool -> classifier
# We want the output of avgpool or just before classifier.
# However, modifying the forward pass or replacing classifier is easier.
# Let's replace the classifier with an Identity layer to get the features.
class Identity(nn.Module):
    def __init__(self):
        super(Identity, self).__init__()
        
    def forward(self, x):
        return x

# The classifier in MobileNetV2 is a Sequential(Dropout, Linear)
# We replace it to get the 1280-dim vector
model.classifier = Identity()

model.eval() # Set to evaluation mode
print("Model loaded.")

# Define preprocessing transforms
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for backend connectivity verification"""
    return jsonify({'status': 'ok', 'service': 'ai-service'}), 200

@app.route('/embed', methods=['POST'])
def generate_embedding():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        input_tensor = preprocess(img)
        input_batch = input_tensor.unsqueeze(0) # create a mini-batch as expected by the model
        
        with torch.no_grad():
            embedding = model(input_batch)
        
        # embedding is a tensor of shape (1, 1280)
        vector = embedding[0].tolist()
        return jsonify({'embedding': vector})
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/similarity', methods=['POST'])
def compute_similarity():
    data = request.json
    if not data or 'target' not in data or 'candidates' not in data:
        return jsonify({'error': 'Invalid input. Expecting target and candidates'}), 400
    
    try:
        target = torch.tensor(data['target'])
        candidates = torch.tensor(data['candidates'])
        
        # Cosine Similarity
        # torch.nn.functional.cosine_similarity
        
        if len(candidates) == 0:
            return jsonify({'scores': []})

        # Ensure target is (1, D)
        if target.dim() == 1:
            target = target.unsqueeze(0)
            
        # Candidates should be (N, D)
        if candidates.dim() == 1:
            candidates = candidates.unsqueeze(0)
            
        # Compute similarity
        # dim=1 means compute across the feature dimension
        scores = torch.nn.functional.cosine_similarity(target, candidates, dim=1)
        
        return jsonify({'scores': scores.tolist()})
    except Exception as e:
        print(f"Error computing similarity: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting AI Service on port 5001...")
    app.run(host='0.0.0.0', port=5001)
