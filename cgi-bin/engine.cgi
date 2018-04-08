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


# def similarity(a: set, b: set) -> float:
#     '''Calculates the jaccard similarity of two sets'''
#     # A&B / (|A| + |B| - |A&B|)
#     if isinstance(a, list): a = set(a)
#     if isinstance(b, list): b = set(b)
#
#     if type(a) is not set or type(b) is not set:
#         raise Exception("invalid types")
#
#     c = a & b # (intersection)
#     return len(c) / (len(a) + len(b) - len(c))


def occurrenceDict(nested: list) -> dict:
    # The underscore is required so titles like "Total Recall" don't match
    occurrences = {'_total': 0}

    for movie in nested:
        for i in movie: # i is either a genre or a word from the title.
            if i in occurrences:
                occurrences[i] += 1
            else:
                occurrences[i] = 1
            occurrences['_total'] += 1
    return occurrences


def weightedSimilarity(oneMoviesProperties: list, occurrenceDict: dict) -> float:
    '''Calculates the weighted similarity between the properties (genres or title words) of one movie and the occurrenceDict'''
    common = 0
    for i in oneMoviesProperties:
        if i in occurrenceDict:
            common += occurrenceDict[i]

    return common / occurrenceDict['_total']

def decomposeTitle(title: str) -> set:
    '''Returns a set of lowercase words in the given string without symbols, numbers, and some common words.'''
    commonwords = set(["and", "the", "a", "aka"])

    # For str.translate()
    removalDict = {ord(c): None for c in '!@#$%^&*(),.<>/?\\\[\]\'-_=+~`1234567890:'}
    return set([ x for x in title.translate(removalDict).casefold().split(" ") if x != "" and x not in commonwords])


try:
    movies = pandas.read_pickle("movies.with.ratings.df.gz")
except:
    movies = pandas.read_csv("movies.with.ratings.csv.gz", compression="gzip", index_col=0)
    movies.to_pickle("movies.with.ratings.df.gz")

print("Content-Type: application/json; charset=utf-8", end="\r\n\r\n")

# rf = "recommendations for", it's passed a list of items that will be used to calculate recommendations.
if 'rf' in form:
    # print("RecommendationsFor specified: ", str(form), file=sys.stderr)
    selections = set(json.loads(form['rf'].value))
    if -1 in selections: # when -1 is desired, get random sample.
        print("Generating randoms", file=sys.stderr)
        recommendations = movies.sample(10)
    else:
        # Here's the meat and potatoes.  Use the genres and titles of the
        # selected movies to find other similar movies.
        print("IDs specified:", form['rf'].value, file=sys.stderr)

        # Since only the movieIds of the selected movies were given, find them in the DataFrame
        selectedMovies = movies.loc[movies.index.isin(selections)]
        selectedTitles = selectedMovies['title']
        selectedGenres = selectedMovies['genres']
        listOfGenres = [ e.split("|") for e in selectedGenres.tolist() ]
        listOfTitles = [ decomposeTitle(e) for e in selectedTitles.tolist() ]

        genreDict = occurrenceDict(listOfGenres)
        titleDict = occurrenceDict(listOfTitles)

        # Add an extra column for the distance
        movies['distanceGenre'] = movies['genres'].map(lambda g: weightedSimilarity(g.split("|"), genreDict))
        movies['distanceTitle'] = movies['title'].map(lambda t: weightedSimilarity(decomposeTitle(t), titleDict))

        ## For each row, set bestDistance to the larger of distanceGenre and distanceTitle
        #movies['bestDistance'] = movies[['distanceGenre', 'distanceTitle']].max(axis=1)

        # Sort movies based on genre, then by title similarity, then finally by title
        sortedMovies = movies.sort_values(by=['distanceGenre', 'distanceTitle', 'title'], ascending=[False, False, True])

        # Exclude selected movies from the recommendations:
        sortedMovies = sortedMovies.loc[~sortedMovies.index.isin(selections)]

        recommendations = sortedMovies.head(10)

    movieList = []
    for index, row in recommendations.iterrows():
        m = {
            'id': index,
            'title': row['title'],
            'poster': posterPath(str(row['imdbId'])),
            'link': imdbLink(str(row['imdbId'])),
            'rating': str(row['rating']) + "/10"
            }
        movieList.append(m)
    movieList.sort(key=lambda m: m['title'])
    print(json.dumps(movieList))
elif 'search' in form and type(form['search'].value) is str:
    searchStr = form['search'].value.strip()
    print("Searching for [", searchStr ,']', file=sys.stderr)
    if len(searchStr) >= 2 and searchStr.startswith("^"):
        # If a search string starts with "^", search at the beginning of the title
        matching = movies.loc[movies['title'].str.contains("^" + re.escape(searchStr[1:].strip()), case=False)]
    elif len(searchStr) > 0:
        matching = movies.loc[movies['title'].str.contains(searchStr, case=False, regex=False)]
    else: # Empty string gets empty response
        print('[]')
        
    movieList = []
    for index, row in matching.sort_values(by=['title', 'imdbId']).head(10).iterrows():
        m = {
            'id': index,
            'title': row['title'],
            'poster': posterPath(str(row['imdbId'])),
            'link': imdbLink(str(row['imdbId'])),
            'rating': str(row['rating']) + "/10"
            }
        movieList.append(m)
    movieList.sort(key=lambda m: m['title'])
    print(json.dumps(movieList))
else:
    print("Invalid option to engine:", str(form), file=sys.stderr)
    print("[]")