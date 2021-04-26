from flask import Flask, request, send_from_directory
from trainer import model

PORT = 5000
WEIGHT_DIR = './trainer/model/tfjs_export/'

app = Flask(__name__)

@app.route('/test')
def hello():
    return 'Hi, trnsvr here!'

@app.route('/train', methods=['GET', 'POST'])
def perform_training():
    if request.method == 'POST':
        model.train_and_export()
        return 'training completed.'

@app.route('/weights', methods=['GET', 'POST'])
def get_weights():
    return send_from_directory(WEIGHT_DIR, 
        'group1-shard1of1.bin', as_attachment=True)

@app.route('/test_file', methods=['GET', 'POST'])
def get_file():
    if request.method == 'POST':
        return send_from_directory(WEIGHT_DIR, 
            'test.txt', as_attachment=True)    

if __name__ == '__main__':
    app.config['SERVER_NAME'] = 'trnsvr:5000'
    app.run(host='0.0.0.0', port=PORT)
