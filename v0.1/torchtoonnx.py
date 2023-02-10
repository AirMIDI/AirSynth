import torch
import onnx

from gesture_model import GestureDetectionModel


def torchtoonnx(model):
    d_input = torch.zeros(1,1,64,64)
    torch.onnx.export(model, d_input, './weights/gesture_onnx_0_1.onnx', opset_version=9, verbose=True)


if __name__ == "__main__":
    model = GestureDetectionModel()
    model.load_state_dict(torch.load(f"./weights/gesture_0_1.pth"))
    torchtoonnx(model)


# if __name__ == "__main__":
#     model = onnx.load('./weights/gesture_onnx_0_1.onnx')
#     nodes = model.graph.node
#     print(nodes[0])