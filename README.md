# doodle-devops
This is an **ML DevOps** demo project that uses a **multi-service** approach for model training, serving and user interaction. The demo is inspired by [Google QuickDraw](https://quickdraw.withgoogle.com/) and uses data from the [QuickDraw Dataset](https://github.com/googlecreativelab/quickdraw-dataset) for pre-training the model.

The key challenge is: Can you draw a cat, dog or mouse so that an AI can recognize it?

**Table of contents:**
* [doodle-devops](#doodle-devops)
* [A multi-service dockerized ML app](#a-multi-service-dockerized-ML-app)
* [Usage](#usage)
* [About the data and pre-training the model](#about-the-data-and-pre-training-the-model)
* [Delta-training with PostgreSQL data](#delta-training-with-postgresql-data)
* [A few notes on the JavaScript side (frontend and backend)](#a-few-notes-on-the-javascript-side)
* [A CI/CD workflow for multiple services](#a-ci/cd-workflow-for-multiple-services)

# A multi-service dockerized ML app

The following figure shows the architecture of the app. In production, an **nginx** proxy is used to interact with the client. The "doodle server" runs on a **React.js** framework and the predictions come from a **TensorFlow.js** model. The latest version of the model is provided by the "model server" running on **Express.js**, which additionally saves the user's doodles - including the category labels and prediction results - in a **PostgreSQL** database. 
Initially, a pre-trained model is provided using the original dataset. The pre-training is done inside a **Google colab** notebook. However, the database is used for delta-training on a "training server" (running for example on a cloud computing platform such as **AWS**) in order to increase the model's performance the more the app is used.

<p align="center">
<img src="https://github.com/alxwdm/doodle-devops/blob/main/doc/multi-services_prod.png" width="700">
</p>

# Usage

The easiest way to try it out is to pull the repo, cd into the main directory and run docker-compose.
```
cd doodle-devops
docker-compose up --build
```

After successfully building the images and creating the containers, the website will be available on `http://localhost:3030`.

# About the data and pre-training the model

The open source [QuickDraw dataset](https://github.com/googlecreativelab/quickdraw-dataset#get-the-data) has been used for training the initial model. I have used the numpy bitmap files (available on [Google Cloud Platform](https://console.cloud.google.com/storage/quickdraw_dataset/full/numpy_bitmap)), which encode the drawings as 28x28 greyscale images in a numpy array. Because the focus of this project is not on the classification task itself, but rather to demonstrate a multi-service ML app, I have reduced the number of categories to classify down to the following three: Cat, dog and mouse. The pre-training is done for free inside a **Google colab** notebook.

Here is how you get the data used for pre-training:
```
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/cat.npy' .
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/dog.npy' .
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/mouse.npy' .
```

The following image shows samples of the drawings for each category from the original dataset:

<p align="center">
<img src="https://github.com/alxwdm/doodle-devops/blob/main/doc/categories_examples.png" width="500">
</p>

A few preprocessing steps, such as normalization and reshaping the data, are neccessary in order to train the model. I have used the **tf.data API** for this, which makes creating an input pipeline easy and integrates neatly into the TensorFlow world. See the [delta-training](#delta-training-with-postgresql-data) section for more details on this.

As this is an image classification task, a straight-forward choice for the classifier algorithm is a convolutional neural network (CNN). The model architecture I have used consists of three convolutional layers, including max-pooling layers, followed by two dense layers with a total of around 93k parameters. This is how the model looks like, using **tf.keras** to create and train it:

```
_________________________________________________________________
Layer (type)                 Output Shape              Param # 
=================================================================
conv2d (Conv2D)              (None, 26, 26, 32)        320       
_________________________________________________________________
max_pooling2d (MaxPooling2D) (None, 13, 13, 32)        0         
_________________________________________________________________
conv2d_1 (Conv2D)            (None, 11, 11, 64)        18496     
_________________________________________________________________
max_pooling2d_1 (MaxPooling2 (None, 5, 5, 64)          0         
_________________________________________________________________
conv2d_2 (Conv2D)            (None, 3, 3, 64)          36928    
_________________________________________________________________
flatten (Flatten)            (None, 576)               0         
_________________________________________________________________
dense (Dense)                (None, 64)                36928     
_________________________________________________________________
dense_1 (Dense)              (None, 3)                 195       
=================================================================
Total params: 92,867
Trainable params: 92,867
Non-trainable params: 0
_________________________________________________________________
```

The dataset is reduced to 50.000 samples per category, resulting in a total of 150.000 samples, of which 3000 samples are reserved for the validation set. After training for 10 epochs with a batch size of 128, a training accuracy of >90% and a validation accuracy of >85% is reached.

```
(...)
Epoch 10/10
1149/1149 [==============================] - 121s 105ms/step - loss: 0.2370 - accuracy: 0.9093 - val_loss: 0.4136 - val_accuracy: 0.8537
``` 

The pre-training finishes with exporting the model into a **TensorFlow.js** compatible format using the tfjs converter.

```
!pip install tensorflowjs
!tensorflowjs_converter --input_format=keras model.h5 tfjs_model
```

# Delta-training with PostgreSQL data

The goal of delta-training is to increase the model's performance the more the app is used. In a production environment, this can have a huge performance impact, especially if the distrubution of the data changes over time. A "static" model will not be able to catch this and may have decreasing performance over time, whereas a delta-trained model adapts to the latest data trends.

For this purpose, all the doodles the production model predicts on are saved into a **PostgreSQL database**. The labels are saved as well as the predicted category - this allows **analyzing the model's performance in production** - together with the insertion timestamp and a train/test-split based on a train ratio percentage. The training server then connects to the database and reads the data with the following SQL query in the `get_data_from_db` function:

```
def get_data_from_db(mode='train', limit=10000, batch_size=-1):
    
    (...) # connect to db

    with conn.cursor() as curs:
        curs.execute(
            '''
            SELECT idx, data 
            FROM doodles 
            WHERE split = %s
            ORDER BY insert_date DESC
            LIMIT %s
            ''',(mode, limit))

        (...) # fetch and yield data
```

Performing the train/test-split inside the database allows for querying the desired `mode` and ensures that each doodle remains in the same set, which is an advantage compared to a random split after querying the data. Also, the `insert_date` is used in combination with a `limit` clause to query only the most recent entries. For this demo purpose, this is sufficient. A more sophisticated solution to prevent training for too many epochs on "old" data would be to either save the timestamp of the last delta-training or add a column to the database to save how often each sample has been used for training.

As you can see from the code snippet above, the feature and label pairs are yielded after fetching the data from the database, which turns the `get_data_from_db` function into a python generator. Using the **tf.data API** turns this into a powerful data pipeline:

```
def read_dataset(mode='train'):
    """
    Gets data from PostgreSQL DB and converts it into a tf.data.Dataset.
    """
    # preprocessing functions
    def _fixup_shape(features, label):
        features = tf.reshape(features, [28, 28, 1])
        label = tf.squeeze(label)
        return features, label
    def _normalize(features, label):
        features = tf.math.divide(features, 255)
        return features, label

    # create tf.Dataset by querying database
    ds = tf.data.Dataset.from_generator(
            get_data_from_db,
            args=[mode], 
            output_types=(tf.float32, tf.int32)
        )
    # apply preprocessing steps
    ds = ds.map(_fixup_shape) \
           .map(_normalize)
    # shuffle, batch and repeat depending on mode
    if mode == 'train':
        ds = ds.shuffle(buffer_size=BUFFER_SIZE).batch(BATCH_SIZE).prefetch(2)
    else:
        ds = ds.batch(BATCH_SIZE).prefetch(2)

    return ds
```

The delta-training function then uses `read_dataset()` to retrieve the train and test sets from the database as preprocessed and batched tensors, trains for a few epochs and exports the Tensorflow.js model. Here's a truncated code snippet of the `train_and_export()` function:

```
def train_and_export():

    (...) # load previously trained model

    # get datasets
    train_ds = read_dataset(mode='train')
    test_ds = read_dataset(mode='test')

    # perform delta-training
    history = model.fit(train_ds, 
                        epochs=TRAIN_STEPS, 
                        steps_per_epoch=None,
                        validation_data=test_ds,
                        validation_freq=1,
                        verbose=1)

    (...) # compare model performance

    # save delta-trained model
    model.save(MODEL_DIR + '/model_latest.h5')

    # convert model into tfjs format
    subprocess.run(['tensorflowjs_converter', '--input_format=keras', 
                MODEL_DIR + '/model_latest.h5', MODEL_DIR + '/tfjs_export'])
```

After comparing the performance of the delta-trained model to the previous version, the model can be deployed by providing it to the model server. In a production environment, this delta-training may be done on an instance inside a cloud computing platform, such as **AWS**. The great advantage here is that the training server can be started up on demand and the instance can be shut down after the training is done, saving the model into a cloud storage bucket. Because this demo does not require a high performance GPU instance for training - and to save AWS credits - the training container is started within the docker-compose file. Instead of using an AWS service, I have implemented a REST API with **Flask** to trigger the delta-training by the model server when enough new data is available.

# A few notes on the JavaScript side

The JavaScript part of the project is based on **Node.js**. The frontend assets are provided by the "doodle-server" and is made using the **React.js** framework. It was set up with [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html#create-react-app) and includes a drawing canvas from [embiem/react-canvas-draw](https://github.com/embiem/react-canvas-draw).
The classification of the drawings is done with a **TensorFlow.js** model that is provided by the "model-server", which runs on **Express.js**. The inference is done on the client side, which means the model is exposed to the browser. In a real world application, this architecture is only reasonable if the model is not an IP-critical part of the business.
The model server also saves the drawings into a database and triggers delta-training when enough new data is available. Additionally, **nginx** serves as a proxy to route the corresponding requests to the doodle server or model server and is used for the production build webserver. 

*Note:* As this is my first project using JavaScript, there may be imperfections in the code. Feedback on improvements are welcome. The core architecture of the JavaScript side was inspired by this udemy course on [Docker and Kubernetes](https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/).

# A CI/CD workflow for multiple services

The following picture shows a CI/CD workflow for a multi-service application (props to [Stephen Grider](https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/)):

<p align="center">
<img src="https://github.com/alxwdm/doodle-devops/blob/main/doc/ci-cd_workflow.png" width="500">
</p>

New features are developed in a separate branch, for example the feature branch. After merging a pull request to the main branch, **Travis CI** starts building the images, runs tests on them and - after passing the tests - deploys the updated images to a cloud provider, for example on **AWS** Elastic Beanstalk, via Docker Hub. The configuration of this CI/CD workflow can be found in the `.travis.yml` file. For the deployment part, the corresponding architecture (such as EB environments, VPNs, etc.) and instances need to be set up inside AWS. Afterwards, the `Dockerrun.aws.json` file contains instructions for AWS on how to use the multiple services.
