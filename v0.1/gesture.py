import os
from torchvision import transforms
from torch.utils.data import Dataset
import numpy as np
import PIL.Image as Image
import PIL.ImageOps as ImageOps
import math
import matplotlib.pyplot as plt
import warnings
warnings.simplefilter('ignore',lineno=44)

class Gesture(Dataset):
    def __init__(self, type, transform=None, size=(64, 64)):
        self.img_dir = "../data/gesture_finger_count/" + type + '/'

        self.size = size

        self.img_labels = []

        for i in range(6):
            self.img_labels.extend([(f, i) for f in os.listdir(f"{self.img_dir}{i}")])

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            # transforms.Normalize(mean=[0.485, 0.456, 0.406],
            #                      std=[0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.img_labels)

    def __getitem__(self, idx):
        img_path = f"{self.img_dir}{self.img_labels[idx][1]}/{self.img_labels[idx][0]}"
        image = Image.open(img_path)
        image = image.resize(self.size)

        label = np.zeros(6, dtype=np.float32)
        label[self.img_labels[idx][1]] = 1

        if self.transform:
            image = self.transform(image)

        return image, label


if __name__ == "__main__":
    dataset = Gesture(type='train')
    print(len(dataset))
    dataset[0]