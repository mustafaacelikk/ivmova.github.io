"""Strict extraction of a verified GitHub outer ZIP and its single bundle.tar.
No networking, credentials, or implicit overwrite. Never use extractall.
"""
import sys, zipfile, tarfile, pathlib, re, stat
MAX=512*1024*1024
def safe(name):
    if name.startswith("./"): name=name[2:]
    if name in ("", "."): return None
    if "\\" in name or ":" in name or name.startswith("/") or any(p in ("", ".", "..") for p in name.rstrip("/").split("/")) or re.search(r"[\x00-\x20\x7f]", name):
        raise ValueError("ARCHIVE_PATH")
    return name.rstrip("/")
def extract(archive,dest):
    dest=pathlib.Path(dest)
    if dest.exists(): raise ValueError("DESTINATION_EXISTS")
    dest.mkdir(parents=True)
    payload=dest.parent/(dest.name+"-bundle.tar")
    with zipfile.ZipFile(archive) as z:
        if z.namelist()!=["bundle.tar"]: raise ValueError("OUTER_ARTIFACT_ALLOWLIST")
        info=z.infolist()[0]
        if info.file_size>MAX or info.flag_bits & 1 or stat.S_ISLNK(info.external_attr>>16): raise ValueError("OUTER_ARTIFACT_LIMIT")
        with z.open(info) as source, payload.open("xb") as target:
            count=0
            while block:=source.read(1024*1024):
                count+=len(block)
                if count>MAX: raise ValueError("OUTER_ARTIFACT_LIMIT")
                target.write(block)
    count=0;seen=set();files=0
    with tarfile.open(payload,"r:") as tar:
        for item in tar:
            name=safe(item.name)
            if name is None:
                if not item.isdir(): raise ValueError("ARCHIVE_ROOT")
                continue
            if name.casefold() in seen: raise ValueError("ARCHIVE_DUPLICATE")
            seen.add(name.casefold())
            if item.issym() or item.islnk() or not (item.isfile() or item.isdir()) or item.sparse: raise ValueError("ARCHIVE_LINK_TYPE")
            target=dest.joinpath(*name.split("/"))
            if item.isdir(): target.mkdir(parents=True,exist_ok=True);continue
            files+=1;count+=item.size
            if count>MAX or files>50000: raise ValueError("ARCHIVE_LIMIT")
            target.parent.mkdir(parents=True,exist_ok=True)
            with tar.extractfile(item) as source, target.open("xb") as out:
                copied=0
                while block:=source.read(1024*1024): copied+=len(block);out.write(block)
                if copied!=item.size: raise ValueError("ARCHIVE_TRUNCATED")
    return payload
if __name__=="__main__":
    print(extract(sys.argv[1],sys.argv[2]))
