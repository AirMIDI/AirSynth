import torch
import torch.nn as nn
import torchvision.models as models
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd
from torchsummary import summary
import matplotlib.pyplot as plt

from gesture import Gesture


class GestureDetectionModel(nn.Module):
    def __init__(self):
        super(GestureDetectionModel, self).__init__()

        self.features = nn.Sequential(
            # 64x64
            nn.Conv2d(1, 16, (3, 3)),
            nn.Conv2d(16, 16, (3, 3)),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2),
            # 30x30
            nn.Conv2d(16, 32, (3, 3)),
            nn.Conv2d(32, 32, (3, 3)),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2),
            # 13x13
            nn.Conv2d(32, 64, (3, 3)),
            nn.Conv2d(64, 64, (3, 3)),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2),
            # 4x4
        )

        self.classifier = nn.Sequential(
            nn.Linear(64*4*4, 6)
        )

        self.softmax = nn.Softmax()

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        x = self.softmax(x)
        return x


def get_pretrained_model(num_pts=98, device=torch.device("cuda:0")):
    model = models.resnet50()
    model.fc = nn.Linear(model.fc.in_features, 2 * num_pts, bias=True)
    model.to(device)
    model.load_state_dict(torch.load(f"./weights/resnet_best_0_4.pth"))

    for p in model.parameters():
        p.requires_grad = True

    return model


def get_pretrained_model_transfer(num_pts=21, device=torch.device("cuda:0")):
    model = models.resnet50()
    model.fc = nn.Linear(model.fc.in_features, 196, bias=True)
    model.load_state_dict(torch.load(f"./weights/resnet_best_0_4.pth"))
    model.fc = nn.Linear(model.fc.in_features, 2 * num_pts, bias=True)
    model.to(device)

    for p in model.parameters():
        p.requires_grad = True

    return model


def train_gesturedetect(model, loader, loss_fn, optimizer, device):
    model.train()
    train_loss = []
    counter = 0
    for images, landmarks in loader:
        counter += 1
        images = images.to(device)

        pred_landmarks = model(images).cpu()  # B x (2 * NUM_PTS)
        loss = loss_fn(pred_landmarks, landmarks)
        train_loss.append(loss.item())

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    return np.mean(train_loss)


def validate_gesturedetect(model, loader, loss_fn, device):
    model.eval()
    val_loss = []
    for images, landmarks in loader:
        images = images.to(device)

        with torch.no_grad():
            pred_landmarks = model(images).cpu()
            loss = loss_fn(pred_landmarks, landmarks)
        val_loss.append(loss.item())
    return np.mean(val_loss)


def collate_fn(batch):
    batch = list(filter(lambda x:x is not None, batch))
    return torch.utils.data.default_collate(batch)


def get_pretrained_model(device=torch.device("cuda:0")):
    model = GestureDetectionModel().to(device)
    model.load_state_dict(torch.load(f"./weights/gesture_0_1.pth"))

    for p in model.parameters():
        p.requires_grad = True

    return model


def train_gesturedetection():
    print("Start Training")
    device = torch.device("cuda:0")
    epoch = 120000
    ver = "0_1"

    model = GestureDetectionModel().to(device)
    loss_fn = nn.CrossEntropyLoss()
    # optimizer = optim.SGD(model.parameters(), lr=3e-5, weight_decay=5e-4, momentum=0.9)
    # optimizer = optim.AdamW(model.parameters(), lr=3e-5)
    optimizer = optim.AdamW(model.parameters(), lr=3e-4)

    train_dataset = Gesture(type='train')
    valid_dataset = Gesture(type='val')

    print(f"Training Dataset: {len(train_dataset)}")
    print(f"Validation Dataset: {len(valid_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=8,
                              num_workers=4, pin_memory=True,
                              shuffle=True, drop_last=True
                              )
    valid_loader = DataLoader(valid_dataset, batch_size=8,
                              num_workers=4, pin_memory=True,
                              shuffle=False, drop_last=False
                              )

    train_losses = []
    val_losses = []

    best_val_mse_losses = np.inf

    for e in range(1, epoch+1):
        print(f'Epoch {e}')

        # Train
        current_train_loss = train_gesturedetect(model, train_loader, loss_fn, optimizer, device)
        train_losses.append(current_train_loss)

        # Validation
        current_loss = validate_gesturedetect(model, valid_loader, loss_fn, device)
        val_losses.append(current_loss)

        print(f'Train loss:          {train_losses[-1]:.7f}')
        print(f'Validation loss:     {val_losses[-1]:.7f}')

        losses = pd.DataFrame(
            list(zip(train_losses, val_losses)),
            columns=['Train', 'Validation']
        )
        losses.to_csv(f'log/gesture_losses_{ver}.csv', index=False)

        # Save best model
        if val_losses[-1] < best_val_mse_losses:
            best_val_mse_losses = val_losses[-1]
            best_epoch = epoch
            with open(f"weights/gesture_{ver}.pth", "wb") as fp:
                torch.save(model.state_dict(), fp)

    print(f'Best epoch: {best_epoch}')


if __name__ == '__main__':
    model = GestureDetectionModel().cuda()
    summary(model, (1,64,64))
    train_gesturedetection()
