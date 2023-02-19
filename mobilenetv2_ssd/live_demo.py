from mobilenet_v2_ssd import create_mobilenetv2_ssd_lite, create_mobilenetv2_ssd_lite_predictor
import cv2


def live_demo(model_path):
    cap = cv2.VideoCapture(0)   # capture from camera
    cap.set(3, 1920)
    cap.set(4, 1080)

    class_names = ('BACKGROUND', 'hand')

    net = create_mobilenetv2_ssd_lite(len(class_names), is_test=True)
    net.load(model_path)

    predictor = create_mobilenetv2_ssd_lite_predictor(net, candidate_size=200)

    while True:
        ret, orig_image = cap.read()
        if orig_image is None:
            continue
        image = cv2.cvtColor(orig_image, cv2.COLOR_BGR2RGB)
        boxes, labels, probs = predictor.predict(image, 10, 0.4)
        print('Detect Objects: {:d}.'.format(labels.size(0)))
        for i in range(boxes.size(0)):
            box = boxes[i, :]
            label = f"{class_names[labels[i]]}: {probs[i]:.2f}"
            cv2.rectangle(orig_image, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (255, 255, 0), 4)

            cv2.putText(orig_image, label,
                        (int(box[0])+20, int(box[1])+40),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,  # font scale
                        (255, 0, 255),
                        2)  # line type
        cv2.imshow('annotated', orig_image)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    live_demo("./log/02_17_2/mobilenet_v2_ssd-Epoch-119-Loss-1.718054469426473.pth")
