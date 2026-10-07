import pathlib, tempfile, tarfile, zipfile, io, subprocess, sys, json
assertions=0
with tempfile.TemporaryDirectory(prefix="ivmova-artifact-test-") as tmp:
    root=pathlib.Path(tmp)
    def archive(name,members,outer=None):
        tar=root/(name+".tar")
        with tarfile.open(tar,"w") as out:
            for info,data in members: out.addfile(info,io.BytesIO(data) if data is not None else None)
        z=root/(name+".zip")
        with zipfile.ZipFile(z,"w") as out: out.writestr(outer or "bundle.tar",tar.read_bytes())
        return z
    def file(name,data=b"synthetic"):
        info=tarfile.TarInfo(name);info.size=len(data);return info,data
    def run(name,members,success=False,outer=None):
        global assertions
        z=archive(name,members,outer)
        r=subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name("publication-extract-artifact.py")),str(z),str(root/name)],capture_output=True,timeout=10)
        assert (r.returncode==0)==success,(name,r.stderr)
        assertions+=1
    run("valid",[file("./public/index.html"),file("./release.json",b"{}")],True)
    assert (root/"valid/public/index.html").read_bytes()==b"synthetic";assertions+=1
    for name,path in [("traversal","../escaped"),("absolute","/escaped"),("backslash","public\\escaped"),("colon","C:escaped")]: run(name,[file(path)])
    link=tarfile.TarInfo("public/link");link.type=tarfile.SYMTYPE;link.linkname="../outside";run("symlink",[(link,None)])
    link.type=tarfile.LNKTYPE;run("hardlink",[(link,None)])
    run("duplicate",[file("public/one"),file("public/one")])
    run("unexpected",[file("public/index.html")],outer="untrusted.tar")
    assert not (root.parent/"escaped").exists();assertions+=1
print(json.dumps({"result":"PASS","assertions":assertions,"archives":"synthetic ZIP/tar","networkCalls":0}))
print("ARTIFACT_TEMP_CLEANUP_OK")
