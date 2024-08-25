import threading


class Timer:
    def __init__(self, interval, function):
        self.interval = interval
        self.function = function
        self.timer = None

    def start(self):
        self.timer = threading.Timer(self.interval, self.function)
        self.timer.start()

    def cancel(self):
        if self.timer:
            self.timer.cancel()

    def reset(self):
        self.cancel()
        self.start()
