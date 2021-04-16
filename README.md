# doodle-devops
This is an **ML DevOps** demo project that uses a **multi-service** approach for model training, serving and user interaction. The demo is inspired by [Google QuickDraw](https://quickdraw.withgoogle.com/) and uses data from the [QuickDraw Dataset](https://github.com/googlecreativelab/quickdraw-dataset) for pre-training the model.
The key challenge is: Can you draw a cat, dog or mouse so that an AI can recognize it?

# A multi-service "dockerized" ML app

The following figure shows the architecture of the app. In production, an **nginx** webserver is used to interact with the user. The client runs on a **React.js** framework and the predictions come from a **TensorFlow.js** model. The latest version of the model is provided by an **Express.js** server, which additionally saves the user's interactions in a **PostgreSQL** database. Initially, a pre-trained model is provided using the original dataset. The pre-training is done inside a **Google colab** notebook. Later, the database is used for delta-training on a cloud computing platform, such as **AWS**, to increase the model's performance the more the app is used.

<p align="center">
<img src="https://github.com/alxwdm/doodle-devops/blob/main/doc/multi-services_prod.png" width="500">
</p>

Note: Currently, a node development server is used instead of nginx.

# Usage

The easiest way to try it out is to pull the repo, cd into the main directory and run docker-compose.
```
cd doodle-devops
docker-compose up --build
```

After successfully building the images and creating the containers, the website will be available on `http://localhost:3000`.

# A CI/CD workflow for multiple services

**TODO** Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

# About the data and pre-training the model

The open source [QuickDraw dataset](https://github.com/googlecreativelab/quickdraw-dataset#get-the-data) has been used for training the initial model. I have used the numpy bitmap files (available on [Google Cloud Platform](https://console.cloud.google.com/storage/quickdraw_dataset/full/numpy_bitmap)], which encode the drawings as 28x28 greyscale images in a numpy array. Because the focus of this project is not on the classification task itself, but rather to demonstrate a multi-service ML app, I have reduced the number of categories to classify down to the following three: Cat, dog and mouse. To save some computing resources, the pre-training is done for free inside a **Google colab** notebook.

Here is how you get the data used for pre-training:
```
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/cat.npy' .
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/dog.npy' .
!gsutil cp 'gs://quickdraw_dataset/full/numpy_bitmap/mouse.npy' .
```

The following image shows samples of the drawings for each category from the original dataset:

<p align="center">
<img src="https://github.com/alxwdm/doodle-devops/blob/main/doc/categories_examples.png" width="700">
</p>

A few preprocessing steps, such as normalization and reshaping, are neccessary in order to train the model. I have used the **tf.data API** for this, which makes shuffling and batching the data easy and integrates neatly into the TensorFlow world. This is how it is done:

```
def input_fn(X_train, X_test, y_train, y_test):
    """
    Takes numpy train-test data and converts it into a tf.data.Dataset
    """

    # preprocessing functions
    def _fixup_shape(features, label):
        features = tf.reshape(features, [28, 28, 1])
        return features, label
    def _normalize(features, label):
        features = tf.math.divide(features, 255)
        return features, label

    # Turn numpy ndarray into tf.Dataset
    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    test_ds = tf.data.Dataset.from_tensor_slices((X_test, y_test))

    # apply preprocessing functions, shuffle and batch
    train_ds = train_ds.map(_fixup_shape) \
                    .map(_normalize)
    train_ds = train_ds.shuffle(buffer_size=BUFFER_SIZE).batch(BATCH_SIZE)

    test_ds = test_ds.map(_fixup_shape) \
                    .map(_normalize)
    test_ds = test_ds.batch(1)

    return train_ds, test_ds
```

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
