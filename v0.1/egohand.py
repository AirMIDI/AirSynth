import os
from torchvision import transforms
from torch.utils.data import Dataset
import numpy as np
import PIL.Image as Image
import math
import matplotlib.pyplot as plt
import warnings
warnings.simplefilter('ignore',lineno=44)

class EgoHand(Dataset):
    def __init__(self, type, transform=None, target_transform=None, size=(256, 256)):
        self.img_dir = "../data/egohands_kitti_formatted/images/"
        self.labels_dir = "../data/egohands_kitti_formatted/labels/"

        self.size = size

        self.img_labels = os.listdir(self.img_dir)
        if type == 'train':
            self.img_labels = self.img_labels[:math.floor(len(self.img_labels)*0.6)]
        elif type =='val':
            self.img_labels = self.img_labels[math.floor(len(self.img_labels)*0.6):math.floor(len(self.img_labels)*0.8)]
        elif type =='test':
            self.img_labels = self.img_labels[math.floor(len(self.img_labels)*0.8):]

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            # transforms.Normalize(mean=[0.485, 0.456, 0.406],
            #                      std=[0.229, 0.224, 0.225])
        ])
        self.target_transform = target_transform

    def __len__(self):
        return len(self.img_labels)

    def __getitem__(self, idx):
        img_path = self.img_dir + self.img_labels[idx]
        image = Image.open(img_path)

        o_w = image.width
        o_h = image.height

        label_path = self.labels_dir + self.img_labels[idx][:-4] + '.txt'
        label = np.genfromtxt(label_path, delimiter=' ', dtype=np.float32)

        if len(label)==0:
            label = np.array([0,0,0,0,0], dtype=np.float32)
        else:
            if label.ndim != 1:
                label = label[0]
            label = label[4:8]

            label = np.insert(label, 0, 1.)

            label[1] /= o_w
            label[2] /= o_h
            label[3] /= o_w
            label[4] /= o_h

        image = image.resize(self.size)

        # plt.imshow(image)
        # plt.plot(label[0]*256,label[1]*256,'r.',markersize=2)
        # plt.plot(label[2]*256,label[3]*256,'r.',markersize=2)
        # plt.show()

        label = label.flatten()

        if self.transform:
            image = self.transform(image)
        if self.target_transform:
            label = self.target_transform(label)

        return image, label


if __name__ == "__main__":
    dataset = EgoHand(type='train')
    print(len(dataset))
    dataset[0]