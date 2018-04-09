"use strict";

console.log("By Rolando Collantes");

// Local cache of movies returned by recommendations or by suggestions
var allMovies = new Set();

// A set of the user's selected movie's movieIds
var userSelections = new Set();

window.dtimer = {};
window.outstanding = {};

// Converts the array of movies to a URI encoded json string.
const RFQuery = movieIdList => encodeURIComponent(JSON.stringify(movieIdList))

// Adds any returned movies to the local cache.
const addToLocalCache = movies=>{
    movies.forEach(m=>allMovies.add(m));
}

// Returns a div containing a movie poster, title, and rating.
// If removeLink is true, a link is made to remove the movie (for selections)
// If posterClickURL is specified, the poster is wrapped in an <a> with the href set to it.
const generateMovie = (title, posterURL, rating, movieId, removeLink, posterClickURL) =>{
    let posterDiv = document.createElement("div");
    posterDiv.classList.add("movie");
    posterDiv.dataset.movieId = movieId;

    // Image
    let posterIMG = document.createElement("img");
    posterIMG.src = posterURL;
    if(posterClickURL && posterClickURL.startsWith("https://")){
        let link = document.createElement("a");
        link.href = posterClickURL;
        link.target = "_blank";
        link.appendChild(posterIMG);
        posterIMG = link;
    }
    posterDiv.appendChild(posterIMG);

    // Title
    posterDiv.appendChild(document.createTextNode(title));
    posterDiv.appendChild(document.createElement("br"));

    // Rating
    posterDiv.appendChild(document.createTextNode("Rating: " + rating));

    // This is used for movies in selections to remove them from consideration.
    if(removeLink === true){
        let link = document.createElement("a");
        link.href = "#";
        link.addEventListener("click", e=>{removeMovie(movieId); e.preventDefault(); return false;})
        link.appendChild(document.createTextNode("Remove"));
        posterDiv.appendChild(document.createElement("br"));
        posterDiv.appendChild(link);
    }

    return posterDiv;

}

// This event handler removes a movie from the selections
const removeMovie = movieId => {
    console.log("removeMove(" + movieId + ")");
    userSelections.delete(movieId);
    getRecommendations();
    let selections = document.querySelector("#selections");
    let children = selections.children;
    for(let i = 0; i < children.length; i++){
        if(children[i].dataset.movieId == movieId){
            selections.removeChild(children[i]);
        }
    }
    if(userSelections.size == 0){
        // When all the selections have been removed, hide the header
        document.querySelector("#selectionsHeader").classList.add("hidden")
    }
}

// This function accepts an array of movie objects and replaces all the current recommendations
const replaceRecommendations = recs=>{
    let header = document.querySelector("#recommendations > h3");
    let div = document.querySelector("#recommendations > .manyMovies");
    // Remove everything in it.
    while(div.lastChild){
        div.removeChild(div.lastChild);
    }
    if(recs.length > 0){
        header.textContent = "Your recommendations:";
        recs.forEach(r => {
            let movie = generateMovie(r.title, r.poster, r.rating, r.id, false, r.link);
            div.appendChild(movie);
        });
    } else {
        header.textContent = "No Recommendations";
    }
}

// Debouncing: it only runs 500ms after the last time this was called.
// Repeated calls are ignored.
// This function searches for the title of a movie, and shows the suggestions returned by the server-side script
//TODO: Separate into different functions
const populateSuggestions = (e)=>{
    if(window.dtimer.populateSuggestions){
        clearInterval(window.dtimer.populateSuggestions);
        window.dtimer.populateSuggestions = null;
    }
    let searchStr = e.target.value.trim();

    if(searchStr == ""){
        document.querySelector("#searchSuggestions").style.display = "none";
        return;
    }

    window.dtimer.populateSuggestions = setTimeout(()=>{
        window.dtimer.populateSuggestions = null;
        // Get search suggestions here
        if(searchStr !== "" && searchStr !== "^"){ // Not empty, and not merely a caret symbol.
            let url = "cgi-bin/engine.cgi?search=" + encodeURIComponent(searchStr);

            // The whole window.outstanding thing is to cancel any outstanding requests if a subsequent one is made.
            // Chrome doesn't support AbortControllers and signals in fetch, so instead generate a
            // random number.  If that random number doesn't match when the promise fulfills, don't do anything

            if(window.outstanding.populateSuggestions){
                if(typeof AbortController != "undefined"){
                    window.outstanding.populateSuggestions.controller.abort();
                }
                window.outstanding.populateSuggestions = null;
            }

            let newController = Math.random();
            if(typeof AbortController != "undefined"){
                newController = new AbortController();
            }
            
            window.outstanding.populateSuggestions = {controller: newController};
            fetch(url, {
                method: "GET",
                signal: newController.signal
            }).then(res=>{
                if(typeof AbortController == "undefined"){
                    if(window.outstanding.populateSuggestions.controller != newController){
                        console.log("This request doesn't match the outstanding request.");
                        Promise.reject();
                    }
                }
                return res.ok ? res.json() : Promise.reject();
            })
            .then(res=>{
                let ul = document.querySelector("#searchSuggestions");
                while(ul.lastChild){
                    ul.removeChild(ul.lastChild);
                }

                if(res.length === 0){
                    document.querySelector("#searchSuggestions").style.display = "none";
                    return;
                } else {
                    res.forEach(r=>allMovies.add(r));
                }
                res.forEach(r=>{
                    let movie = generateMovie(r.title, r.poster, r.rating, r.id, false, false);
                    let li = document.createElement("li");
                    li.appendChild(movie);
                    li.addEventListener("click", e=>{
                        let childMovie = li.querySelector(".movie");
                        let movieId = parseInt(childMovie.dataset.movieId);
                        addToSelections(movieId);
                        clearSearchBox();
                    });
                    ul.appendChild(li);         
                });
                document.querySelector("#searchSuggestions").style.display = "flex";
            })
            .catch(res=>console.error("suggestion error", res));
        } else {
            document.querySelector("#searchSuggestions").style.display = "none";
            return;
        }

        console.log("searched:", searchStr);
    }, 500);
}

// This is the body of getRecommendations().  Otherwise, there would be two places where this would be copy/pasted
const getRecommendationsLogic = ()=>{
    window.dtimer.getRecommendations = null;
    console.log("getRecommendationsLogic() performing");
    if(window.outstanding.getRecommendations){
        if(typeof AbortController != "undefined"){
            window.outstanding.getRecommendations.controller.abort();
        }
        window.outstanding.getRecommendations = null;
    }

    if(userSelections.size == 0){
        if(window.irecs){
            replaceRecommendations(window.irecs);
        } else {
            // Initial Recommendations
            fetch("cgi-bin/engine.cgi?rf=" + RFQuery([-1]))
            .then(res=>res.ok ? res.json() : Promise.reject())
            .then(res=>{
                window.irecs = res;
                if(res.length >= 1){
                    addToLocalCache(res);
                }
                replaceRecommendations(res);
            })
            .catch(res=>console.log("error: ", res))
        }
    } else {
        // Trying to avoid a race condition when multiple movies are removed at once,
        // selection is then 0, but one of the intermittent calculations overrides this.
        let newController = Math.random();
        if(typeof AbortController != "undefined"){
            newController = new AbortController();
        }
        
        window.outstanding.getRecommendations = {controller: newController};
        
        fetch("cgi-bin/engine.cgi?rf=" + RFQuery(Array.from(userSelections)), {
            method: "GET",
            signal: newController.signal
        })
        .then(res=>{
            if(typeof AbortController == "undefined"){
                if(window.outstanding.getRecommendations.controller != newController){
                    console.log("This request doesn't match the outstanding request.");
                    Promise.reject();
                }
            }
            return res.ok ? res.json() : Promise.reject()
        })
        .then(res=>{
            if(res.length >= 1){
                addToLocalCache(res);
            }
            replaceRecommendations(res);
        })
        .catch(res=>console.log("error: ", res))
    }
}

// Get movie recommendations based on the selections.
const getRecommendations = now=>{
    console.log("getRecommendations() starting. now? ", !!now);
    if(window.dtimer.getRecommendations){
        clearInterval(window.dtimer.getRecommendations);
        window.dtimer.getRecommendations = null;
    }
    if(now){
        getRecommendationsLogic();
    } else {
        window.dtimer.getRecommendations = setTimeout(getRecommendationsLogic, 500);
    }
}

// Clicking on a movie or clicking on the clear button hides the suggestions div.
const clearSearchBox = ()=>{
    let box = document.querySelector("#searchBox");
    box.value = "";
    let ul = document.querySelector("#searchSuggestions");
    while(ul.lastChild){
        ul.removeChild(ul.lastChild);
    }
    document.querySelector("#searchSuggestions").style.display = "none";
    box.focus();
    return false;
}

// Searches the allMovies cache for the movie with the specified movieId
const getMovie = movieId =>{
    let movie = {};
    allMovies.forEach(m=>{
        if(m.id == movieId){
            movie = m;
        }
    });
    return movie;
}

// Used when a movie is clicked in the suggestions div
const addToSelections = movieId=>{
    if(userSelections.has(movieId))
        return; // Already selected
    // Show the selections header
    document.querySelector("#selectionsHeader").classList.remove("hidden")

    let fullMovie = getMovie(movieId);
    userSelections.add(movieId);
    let movieDiv = generateMovie(fullMovie.title, fullMovie.poster,
        fullMovie.rating ? fullMovie.rating : "DUNNO", fullMovie.id, true, fullMovie.link)
    let container = document.querySelector("#selections");
    container.appendChild(movieDiv);
    getRecommendations();
}

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);

// Get initial (10 random) recommendations
getRecommendations(true);

// Clear and focus on the searchbox
clearSearchBox();