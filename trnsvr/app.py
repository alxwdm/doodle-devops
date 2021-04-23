from flask import Flask, request

PORT = 5000

app = Flask(__name__)

@app.route('/test')
def hello():
    return 'Hi, trnsvr here!'

@app.route('/train', methods=['GET', 'POST'])
def perform_training():
    if request.method == 'POST':
        # TOOD
        return 'training started'
    return 'training GET request'

if __name__ == '__main__':
    app.config['SERVER_NAME'] = 'trnsvr:5000'
    app.run(host='0.0.0.0', port=PORT)
