#!/usr/bin/env python3

import cgi, cgitb
import os, sys
import json
import pandas

def posterPath(imdbId):
    imdbId = imdbId.zfill(7)
    f2 = imdbId[:2]
    n2 = imdbId[2:4]
    path = "/".join(["posters", f2, n2, imdbId])
    path += ".jpg"
    return path

imdbLink = lambda imdbId: "https://www.imdb.com/title/tt" + imdbId.zfill(7) + "/" 

print("Content-Type: application/json; charset=utf-8", end="\r\n\r\n")

# form = cgi.FieldStorage()
# action = form.getvalue("random")
try:
    movies = pandas.read_pickle("movies.df.gz")
except:
    movies = pandas.read_csv("movies.csv.gz", compression="gzip")
    movies.to_pickle("movies.df.gz")

randoms = movies.sample(10)

output = []
for index, row in randoms.iterrows():
    o = {
        'id': index,
        'title': row['title'],
        'poster': posterPath(str(row['imdbId'])),
        'link': imdbLink(str(row['imdbId']))
        }
    output.append(o)

print(json.dumps(output))