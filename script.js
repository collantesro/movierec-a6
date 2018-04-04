"use strict";

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
            let movie = generateMovie(r.title, r.poster, "3/3", r.id, false, r.link);
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
            document.querySelector("#searchSuggestions").style.display = "block";
        } else {
            document.querySelector("#searchSuggestions").style.display = "none";
            return;
        }

        console.log("would search:", e.target.value);
    }, 500);
}

const  getInitialRecommendations = ()=>{
    fetch("/cgi-bin/engine.cgi")
    .then(res=>res.ok ? res.json() : Promise.reject())
    .then(res=>{
        window.recs = res;
        replaceRecommendations();
    })
    .catch(res=>console.log("error: ",res))
}

document.querySelector("#generateMovie").addEventListener("click", e=>{
    let movieId = Math.random().toString(36).substr(2,5);
    let rating = Math.random() * 4 + 1;
    rating = rating.toFixed(2);
    rating = rating + "/5";
    let movie = generateMovie("namehere", "", rating, movieId, true, false);
    document.querySelector("#selections").appendChild(movie);
})

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);

getInitialRecommendations();