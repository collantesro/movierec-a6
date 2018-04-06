#!/usr/bin/env python3

import cgi, cgitb
import os, sys
import json
import pandas

form = cgi.FieldStorage()

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
    movies = pandas.read_pickle("movies.with.ratings.df.gz")
except:
    movies = pandas.read_csv("movies.with.ratings.csv.gz", compression="gzip")
    movies.to_pickle("movies.with.ratings.df.gz")

if 'search' not in form or form['search'].value == "":
    randoms = movies.sample(10)

    output = []
    for index, row in randoms.iterrows():
        o = {
            'id': index,
            'title': row['title'],
            'poster': posterPath(str(row['imdbId'])),
            'link': imdbLink(str(row['imdbId'])),
            'rating': str(row['rating']) + "/10"
            }
        output.append(o)

    print(json.dumps(output))
elif type(form['search'].value) is str:
    matching = movies.loc[movies['title'].str.contains(form['search'].value, case=False, regex=False)]
    output = []
    for index, row in matching.head(10).iterrows():
        o = {
            'id': index,
            'title': row['title'],
            'poster': posterPath(str(row['imdbId'])),
            'link': imdbLink(str(row['imdbId'])),
            'rating': str(row['rating']) + "/10"
            }
        output.append(o)
    print(json.dumps(output))
else:
    print("[]")