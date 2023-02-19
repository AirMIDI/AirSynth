import numpy as np
import pathlib
import cv2
import os
import math


class EgoDataset:

    def __init__(self, root, transform=None, target_transform=None, is_test=False):
        """Dataset for EgoHands data.
        Args:
            root: the root of the EgoHands dataset, the directory contains the following sub-directories:
                Annotations, ImageSets, JPEGImages, SegmentationClass, SegmentationObject.
        """
        self.root = pathlib.Path(root)
        self.transform = transform
        self.target_transform = target_transform

        self.ids = [s[:-4] for s in os.listdir(self.root / "images")]
        if is_test:
            self.ids = self.ids[math.floor(len(self.ids)*0.6):]
        else:
            self.ids = self.ids[:math.floor(len(self.ids)*0.6)]

        self.class_names = ('BACKGROUND', 'hand')

        self.class_dict = {class_name: i for i, class_name in enumerate(self.class_names)}

    def __getitem__(self, index):
        image_id = self.ids[index]
        try:
            boxes, labels = self._get_annotation(image_id)
        except Exception as e:
            return None
        if boxes.ndim < 2:
            return None
        image = self._read_image(image_id)
        if self.transform:
            try:
                image, boxes, labels = self.transform(image, boxes, labels)
            except Exception as e:
                return None
        if self.target_transform:
            boxes, labels = self.target_transform(boxes, labels)
        return image, boxes, labels

    def get_image(self, index):
        image_id = self.ids[index]
        image = self._read_image(image_id)
        if self.transform:
            image, _ = self.transform(image)
        return image

    def get_annotation(self, index):
        image_id = self.ids[index]
        return image_id, self._get_annotation(image_id)

    def __len__(self):
        return len(self.ids)

    @staticmethod
    def _read_image_ids(image_sets_file):
        ids = []
        with open(image_sets_file) as f:
            for line in f:
                ids.append(line.rstrip())
        return ids

    def _get_annotation(self, image_id):
        annotation_file = self.root / f"labels/{image_id}.txt"
        boxes = []
        labels = []
        with open(annotation_file) as f:
            for line in f:
                contents = line.rstrip().split()
                x1 = float(contents[4])
                y1 = float(contents[5])
                x2 = float(contents[6])
                y2 = float(contents[7])
                boxes.append([x1, y1, x2, y2])
                labels.append(self.class_dict[contents[0]])

        return (np.atleast_2d(np.array(boxes, dtype=np.float32)),
                np.array(labels, dtype=np.int64))

    def _read_image(self, image_id):
        image_file = self.root / f"images/{image_id}.jpg"
        image = cv2.imread(str(image_file))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image
