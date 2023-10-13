"""
File system utils.
"""
import collections
import os
import pickle
import sys
import errno
import shutil
import glob
# import pwd
import codecs
import hashlib
import tarfile
import fnmatch
import tempfile
import logging

from datetime import datetime
from socket import gethostname

def is_sequence(obj):
    """
    Returns:
      True if the sequence is a collections.Sequence and not a string.
    """
    return isinstance(obj, collections.abc.Sequence) and not isinstance(obj, str)

def pack_varargs(args):
    """
    Pack *args or a single list arg as list

    def f(*args):
        arg_list = pack_varargs(args)
        # arg_list is now packed as a list
    """
    assert isinstance(args, tuple), "please input the tuple `args` as in *args"
    if len(args) == 1 and is_sequence(args[0]):
        return args[0]
    else:
        return args
    
def f_expand(fpath):
    return os.path.expandvars(os.path.expanduser(fpath))

def f_join(*fpaths):
    """
    join file paths and expand special symbols like `~` for home dir
    """
    fpaths = pack_varargs(fpaths)
    fpath = f_expand(os.path.join(*fpaths))
    if isinstance(fpath, str):
        fpath = fpath.strip()
    return fpath


def load_text(*fpaths, by_lines=False):
    with open(f_join(*fpaths), "r") as fp:
        if by_lines:
            return fp.readlines()
        else:
            return fp.read()