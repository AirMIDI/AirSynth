import PIL.Image as Image
import PIL.ImageOps as ImageOps
import PIL.ImageChops as ImageChops
import torch
import torch.nn as nn
from torchvision import transforms
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import numpy as np

from model import HandDetectionModel
import gesture_model
from egohand_2 import FaceBoxes


def unittest_handdetection():
    print()


def remove_prefix(state_dict, prefix):
    ''' Old style model is stored with all names of parameters sharing common prefix 'module.' '''
    print('remove prefix \'{}\''.format(prefix))
    f = lambda x: x.split(prefix, 1)[-1] if x.startswith(prefix) else x
    return {f(key): value for key, value in state_dict.items()}


def unittest_hand2detection():
    device = torch.device("cuda:0")
    model = FaceBoxes('test', None, 2).to(device)
    pretrained_dict = torch.load(f"./weights/Final_HandBoxes.pth", map_location=lambda storage, loc: storage.cuda(device))
    if "state_dict" in pretrained_dict.keys():
        pretrained_dict = remove_prefix(pretrained_dict['state_dict'], 'module.')
    else:
        pretrained_dict = remove_prefix(pretrained_dict, 'module.')
    model.load_state_dict(pretrained_dict, strict=False)
    model.eval()

    # img_path = '../data/egohands_kitti_formatted/images/CARDS_COURTYARD_B_T_frame_0011.jpg'
    img_path = '../data/custom/img_1.png'
    orig_image = Image.open(img_path).convert('RGB')
    width = orig_image.width
    height = orig_image.height
    image = orig_image.resize((256,256))
    image = ImageChops.subtract(image, Image.new('RGB', (256,256), (104,117,123)))
    img_transform = transforms.Compose([
        transforms.ToTensor(),
        # transforms.Normalize(mean=[0.485, 0.456, 0.406],
        #                      std=[0.229, 0.224, 0.225])
    ])
    image_tr = img_transform(image)
    mean, std = image_tr.mean([1,2]), image_tr.std([1,2])
    transform_norm = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean, std)
    ])
    image = transform_norm(image).cuda()
    image.to(torch.device("cuda:0"))

    pred = model(image.unsqueeze(0))
    bbox = pred[0].cpu().squeeze(0).data.numpy()
    conf = pred[1].cpu().squeeze(0).data.numpy()[:, 1]
    c_max = np.max(conf)
    conf = np.where(conf==c_max)
    print(bbox, conf, c_max)

    bbox = np.squeeze(bbox[conf])

    print(bbox)

    lx = width*bbox[0]
    ly = height*bbox[3]
    bw = width*(bbox[2]-bbox[0])
    bh = height*(bbox[1]-bbox[3])

    fig, ax = plt.subplots()
    ax.imshow(orig_image)
    ax.add_patch(Rectangle((lx, ly), bw, bh))
    plt.show()


def unittest_gesturedetection():
    model = gesture_model.get_pretrained_model()
    model.eval()

    # img_path = '../data/gesture_finger_count/val/3/22c91a41-8fc9-4565-8759-132c1a793794.png'
    img_path = '../data/gesture_finger_count/test/2/365132cd-235c-4a8e-9329-eecd42ea4832.png'
    # img_path = '../data/custom/img.png'
    orig_image = Image.open(img_path)
    orig_image = ImageOps.grayscale(orig_image)
    image = orig_image.resize((64,64))
    img_transform = transforms.Compose([
        transforms.ToTensor(),
        # transforms.Normalize(mean=[0.485, 0.456, 0.406],
        #                      std=[0.229, 0.224, 0.225])
    ])
    image = img_transform(image).cuda()
    image.to(torch.device("cuda:0"))

    pred = model(image.unsqueeze(0))
    print(pred)

    plt.imshow(orig_image, cmap='gray')
    plt.show()


if __name__=='__main__':
    unittest_hand2detection()