import torch
import torch.nn as nn
import torchvision.models as models
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd
from torchsummary import summary
import matplotlib.pyplot as plt

from egohand import EgoHand


class HandDetectionModel(nn.Module):
    def __init__(self):
        super(HandDetectionModel, self).__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 16, (3, 3), stride=(2,2), padding='valid'),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2),
            nn.Conv2d(16, 32, (3, 3), stride=(2,2), padding='valid'),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2),
            nn.Conv2d(32, 64, (3, 3), stride=(2,2), padding='valid'),
            nn.ReLU(),
            nn.MaxPool2d(2, stride=2)
        )

        final_conv = nn.Conv2d(64, 5, kernel_size=1)
        self.classifier = nn.Sequential(
            nn.Dropout(0.5), final_conv, nn.ReLU(inplace=True), nn.AdaptiveAvgPool2d((1, 1))
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)

        return torch.flatten(x,1)


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


def train_handdetect(model, loader, loss_fn, optimizer, device):
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


def validate_handdetect(model, loader, loss_fn, device):
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
    model = HandDetectionModel().to(device)
    model.load_state_dict(torch.load(f"./weights/handdetect_0_2.pth"))

    for p in model.parameters():
        p.requires_grad = True

    return model


def train_handdetection():
    print("Start Training")
    device = torch.device("cuda:1")
    epoch = 120000
    ver = "0_2"

    # model = HandDetectionModel().to(device)
    model = get_pretrained_model(device)
    loss_fn = nn.MSELoss()
    # optimizer = optim.SGD(model.parameters(), lr=3e-5, weight_decay=5e-4, momentum=0.9)
    # optimizer = optim.AdamW(model.parameters(), lr=3e-5)
    optimizer = optim.AdamW(model.parameters(), lr=3e-4)

    train_dataset = EgoHand(type='train')
    valid_dataset = EgoHand(type='val')

    print(f"Training Dataset: {len(train_dataset)}")
    print(f"Validation Dataset: {len(valid_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=4,
                              num_workers=4, pin_memory=True,
                              shuffle=True, drop_last=True, collate_fn=collate_fn
                              )
    valid_loader = DataLoader(valid_dataset, batch_size=4,
                              num_workers=4, pin_memory=True,
                              shuffle=False, drop_last=False, collate_fn=collate_fn
                              )

    train_losses = []
    val_losses = []

    best_val_mse_losses = np.inf

    for e in range(1, epoch+1):
        print(f'Epoch {e}')

        # Train
        current_train_loss = train_handdetect(model, train_loader, loss_fn, optimizer, device)
        train_losses.append(current_train_loss)

        # Validation
        current_loss = validate_handdetect(model, valid_loader, loss_fn, device)
        val_losses.append(current_loss)

        print(f'Train loss:          {train_losses[-1]:.7f}')
        print(f'Validation loss:     {val_losses[-1]:.7f}')

        losses = pd.DataFrame(
            list(zip(train_losses, val_losses)),
            columns=['Train', 'Validation']
        )
        losses.to_csv(f'log/handdetect_losses_{ver}.csv', index=False)

        # Save best model
        if val_losses[-1] < best_val_mse_losses:
            best_val_mse_losses = val_losses[-1]
            best_epoch = epoch
            with open(f"weights/handdetect_{ver}.pth", "wb") as fp:
                torch.save(model.state_dict(), fp)

    print(f'Best epoch: {best_epoch}')


if __name__ == '__main__':
    model = HandDetectionModel().cuda()
    summary(model, (3,256,256))
    train_handdetection()
