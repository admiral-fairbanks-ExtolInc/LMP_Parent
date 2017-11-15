#!/bin/bash

rsync -avzh --progress -e ssh app/ pi@raspi1:/home/pi/projects/LMP_Parent/app/
rsync -avzh --progress -e ssh bin/ pi@raspi1:/home/pi/projects/LMP_Parent/bin/
rsync -avzh --progress -e ssh config/ pi@raspi1:/home/pi/projects/LMP_Parent/config/
rsync -avzh --progress -e ssh test/ pi@raspi1:/home/pi/projects/LMP_Parent/test/
#rsync -avzh --progress -e ssh package.json pi@raspi1:/home/pi/projects/LMP_Parent/
#rsync -avzh --progress -e ssh package-lock.json pi@raspi1:/home/pi/projects/LMP_Parent/
rsync -avzh --progress -e ssh --files-from=bin/rsync-files.txt ./ pi@raspi1:/home/pi/projects/LMP_Parent/
