"use strict";

var allMovies = new Set();

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
    let selections = document.querySelector("#selections");
    let children = selections.children;
    for(let i = 0; i < children.length; i++){
        if(children[i].dataset.movieId == movieId){
            selections.removeChild(children[i]);
        }
    }
}

const replaceRecommendations = ()=>{
    if(window.recs){
        let header = document.querySelector("#recommendations > h3");
        header.textContent = "Your recommendations:";
        let div = document.querySelector("#recommendations > .manyMovies");
        // Remove everything in it.
        while(div.lastChild){
            div.removeChild(div.lastChild);
        }
        window.recs.forEach(r => {
            let movie = generateMovie(r.title, r.poster, r.rating, r.id, false, r.link);
            div.appendChild(movie);
        });
    }
}

// Debouncing: it only runs 500ms after the last time this was called.
// Repeated calls are ignored.
const  populateSuggestions = (e)=>{
    if(window.dtimer){
        clearInterval(window.dtimer);
        window.dtimer = null;
    }
    window.dtimer = setTimeout(()=>{
        
        // Get search suggestions here
        if(e.target.value !== ""){
            let url = "/cgi-bin/engine.cgi?search=" + encodeURI(e.target.value);

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
                        let movieId = childMovie.dataset.movieId;
                        let fullMovie = getMovie(movieId);
                        addToSelections(generateMovie(fullMovie.title, fullMovie.poster,
                            fullMovie.rating ? fullMovie.rating : "DUNNO", fullMovie.id, true, false));
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

        console.log("searched:", e.target.value);
    }, 500);
}

const getInitialRecommendations = ()=>{
    fetch("/cgi-bin/engine.cgi")
    .then(res=>res.ok ? res.json() : Promise.reject())
    .then(res=>{
        window.recs = res;
        if(res.length >= 1){
            res.forEach(r=>allMovies.add(r));
        }
        replaceRecommendations();
    })
    .catch(res=>console.log("error: ",res))
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

const addToSelections = movieDiv=>{
    let container = document.querySelector("#selections");
    container.appendChild(movieDiv);
}

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);

getInitialRecommendations();
clearSearchBox();