"""Logger module"""
import shutil
import json
import termcolor
from typing import Any

terminal_width = shutil.get_terminal_size((80, 20)).columns

class Logger:
    def debug(msg: Any, *args):
        print(
            termcolor.colored("[DEBUG]" + "-" * (int(terminal_width * 0.9) - 1), "yellow")
        )
        print(str(msg) + str(*args))
        print(
            termcolor.colored("  " + "-" * (int(terminal_width * 0.9) + 3) + "\n", "yellow")
        )


    def success(msg: Any, *args):
        print(termcolor.colored("[SUCCESS] " + str(msg) + str(*args), "green"))


    def info(msg: Any, *args):
        if any(isinstance(arg, dict) for arg in args) or isinstance(msg, dict):
            print(
                termcolor.colored(
                    "[INFO] " + json.dumps(msg, *args, indent=4, ensure_ascii=False), "blue"
                )
            )
        else:
            print(termcolor.colored("[INFO] " + str(msg) + str(*args), "blue"))


    def error(msg: Any, *args):
        print(termcolor.colored("[Error] " + str(msg) + str(*args), "red"))

logger = Logger()