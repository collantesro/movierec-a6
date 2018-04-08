#!/usr/bin/env python3

import cgi, cgitb, os, sys, json, re
import pandas

# At least with python3 -m http.server --cgi, the CWD of the script is the root path.
# This statement changes directory to the script's parent directory.
os.chdir(os.path.dirname(os.path.abspath(__file__)))

form = cgi.FieldStorage()
if 'DEBUG' in os.environ:
    print(str(os.environ), file=sys.stderr)

def posterPath(imdbId: str) -> str:
    imdbId = imdbId.zfill(7)
    f2 = imdbId[:2]
    n2 = imdbId[2:4]
    path = "/".join(["posters", f2, n2, imdbId])
    path += ".jpg"
    return path


imdbLink = lambda imdbId: "https://www.imdb.com/title/tt" + imdbId.zfill(7) + "/" 


def similarity(a: set, b: set) -> float:
    '''Calculates the jaccard similarity of two sets'''
    # A&B / (|A| + |B| - |A&B|)
    if isinstance(a, list): a = set(a)
    if isinstance(b, list): b = set(b)

    if type(a) is not set or type(b) is not set:
        raise Exception("invalid types")

    c = a & b # (intersection)
    return len(c) / (len(a) + len(b) - len(c))


def genreDictionary(nestedListOfGenres: list) -> dict:
    output = {'total': 0}

    for movie in nestedListOfGenres:
        for genre in movie:
            if genre in output:
                output[genre] += 1
            else:
                output[genre] = 1
            output['total'] += 1
    return output


def weightedSimilarity(oneMovieGenres: list, genreDict: dict) -> float:
    '''Calculates the weighted similarity between the genres of one movie and the genreDict'''
    common = 0
    for genre in oneMovieGenres:
        if genre in genreDict:
            common += genreDict[genre]

    return common / genreDict['total']


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
        # Here's the meat and potatoes.  Use the genres of the selected movies to
        # find other similar movies.
        print("IDs specified:", form['rf'].value, file=sys.stderr)
        
        selectedMovies = movies.loc[movies.index.isin(selections)]
        selectedGenres = selectedMovies['genres']
        listOfGenres = [ e.split("|") for e in selectedGenres.tolist() ]
        genreDict = genreDictionary(listOfGenres)

        # Add an extra column for the distance
        movies['distance'] = movies['genres'].map(lambda g: weightedSimilarity(g.split("|"), genreDict))

        # Sort movies based on the distance value, then by title
        sortedMovies = movies.sort_values(by=['distance', 'title'], ascending=[False, True])

        # Exclude selected movies:
        sortedMovies = sortedMovies.loc[~sortedMovies.index.isin(selections)]

        recommendations = sortedMovies.head(10)

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