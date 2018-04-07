"use strict";

var allMovies = new Set();
var userSelections = new Set();

window.dtimer = {};

const RFQuery = movieIdList => encodeURIComponent(JSON.stringify(movieIdList))
const addToLocalCache = movies=>{
    movies.forEach(m=>allMovies.add(m));
}

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
}

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
//TODO: Separate into different functions
const  populateSuggestions = (e)=>{
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
        if(searchStr !== ""){
            let url = "/cgi-bin/engine.cgi?search=" + encodeURIComponent(searchStr);

            if(window.outstanding){
                if(typeof AbortController != "undefined"){
                    window.outstanding.controller.abort();
                }
                window.outstanding = null;
            }

            let newController = Math.random();
            if(typeof AbortController != "undefined"){
                newController = new AbortController();
            }
            
            window.outstanding = {controller: newController};
            fetch(url, {
                method: "GET",
                signal: newController.signal
            }).then(res=>{
                if(typeof AbortController == "undefined"){
                    if(window.outstanding.controller != newController){
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

const getRecommendationsLogic = ()=>{
    window.dtimer.getRecommendations = null;
    console.log("getRecommendationsLogic() performing");
    if(userSelections.size == 0){
        if(window.irecs){
            replaceRecommendations(window.irecs);
        } else {
            // Initial Recommendations
            fetch("/cgi-bin/engine.cgi?rf=" + RFQuery([-1]))
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
        fetch("/cgi-bin/engine.cgi?rf=" + RFQuery(Array.from(userSelections)))
        .then(res=>res.ok ? res.json() : Promise.reject())
        .then(res=>{
            if(res.length >= 1){
                addToLocalCache(res);
            }
            replaceRecommendations(res);
        })
        .catch(res=>console.log("error: ", res))
    }
}

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

const getMovie = movieId =>{
    let movie = {};
    allMovies.forEach(m=>{
        if(m.id == movieId){
            movie = m;
        }
    });
    return movie;
}

const addToSelections = movieId=>{
    if(userSelections.has(movieId))
        return; // Already selected

    let fullMovie = getMovie(movieId);
    userSelections.add(movieId);
    let movieDiv = generateMovie(fullMovie.title, fullMovie.poster,
        fullMovie.rating ? fullMovie.rating : "DUNNO", fullMovie.id, true, false)
    let container = document.querySelector("#selections");
    container.appendChild(movieDiv);
    getRecommendations();
}

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);

getRecommendations(true);
clearSearchBox();