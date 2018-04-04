#!/usr/bin/env python3

import cgi, cgitb
import os, sys
import json
import pandas

print("Content-Type: application/json", end="\r\n\r\n")

# form = cgi.FieldStorage()
# action = form.getvalue("random")
movies = pandas.read_csv("movies.csv.gz", compression="gzip")
randoms = movies.sample(10)

output = []
for index, row in randoms.iterrows():
    posterPath = str(row['imdbId']).zfill(7)
    posterPath = posterPath[:2] + "/" + posterPath[2:4] + "/" + posterPath + ".jpg"
    o = {
        'id': index,
        'title': row['title'],
        'poster': posterPath
        }
    output.append(o)

print(json.dumps(output))