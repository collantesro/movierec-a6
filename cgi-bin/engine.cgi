#!/usr/bin/env python3

import cgi, cgitb, os, sys, json, re
import pandas

os.chdir(os.path.dirname(os.path.abspath(__file__)))

form = cgi.FieldStorage()

def posterPath(imdbId):
    imdbId = imdbId.zfill(7)
    f2 = imdbId[:2]
    n2 = imdbId[2:4]
    path = "/".join(["posters", f2, n2, imdbId])
    path += ".jpg"
    return path

imdbLink = lambda imdbId: "https://www.imdb.com/title/tt" + imdbId.zfill(7) + "/" 

# form = cgi.FieldStorage()
# action = form.getvalue("random")
try:
    movies = pandas.read_pickle("movies.with.ratings.df.gz")
except:
    movies = pandas.read_csv("movies.with.ratings.csv.gz", compression="gzip", index_col=0)
    movies.to_pickle("movies.with.ratings.df.gz")

print("Content-Type: application/json; charset=utf-8", end="\r\n\r\n")

# rf = "recommendations for", it's passed a list of items that will be used to calculate recommendations.
if 'rf' in form:
    print("RecommendationsFor specified: ", str(form), file=sys.stderr)
    selections = set(json.loads(form['rf'].value))
    if -1 in selections: # when -1 is desired, get random sample.
        print("Generating randoms", file=sys.stderr)
        recommendations = movies.sample(10)
    else:
        #For now, recommend the same items selected
        print("IDs specified:", form['rf'].value, file=sys.stderr)
        selections = set(json.loads(form['rf'].value))
        recommendations = movies.loc[movies.index.isin(selections)]

    output = []
    for index, row in recommendations.iterrows():
        o = {
            'id': index,
            'title': row['title'],
            'poster': posterPath(str(row['imdbId'])),
            'link': imdbLink(str(row['imdbId'])),
            'rating': str(row['rating']) + "/10"
            }
        output.append(o)

    print(json.dumps(output))
elif 'search' in form and type(form['search'].value) is str:
    searchStr = form['search'].value
    print("Searching for [", searchStr ,']', file=sys.stderr)
    if len(searchStr) >= 2 and searchStr.startswith("*"):
        matching = movies.loc[movies['title'].str.contains(searchStr[1:], case=False, regex=False)]
    else:
        matching = movies.loc[movies['title'].str.contains("^" + re.escape(searchStr), case=False)]
        
    output = []
    for index, row in matching.sort_values(by=['title', 'imdbId']).head(10).iterrows():
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
    print("Invalid option to engine:", str(form), file=sys.stderr)
    print("[]")