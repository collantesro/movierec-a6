"use strict";

const generateMovie = (posterURL, rating, movieId, removeLink) =>{
    let posterDiv = document.createElement("div");
    posterDiv.classList.add("movie");
    posterDiv.dataset.movieId = movieId;

    // Image
    let posterIMG = new Image();
    posterIMG.src = posterURL;
    posterDiv.appendChild(posterIMG);

    // Rating
    posterDiv.appendChild(document.createTextNode(rating));

    if(removeLink === true){
        let link = document.createElement("a");
        link.addEventListener("click", e=>{removeMovie(movieId)})
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

// Debouncing: it only runs 500ms after the last time this was called.
// Repeated calls are ignored.
let populateSuggestions = (e)=>{
    if(window.dtimer){
        clearInterval(window.dtimer);
        window.dtimer = null;
    }
    window.dtimer = setTimeout(()=>{
        // True Function body here:

        console.log("would search:", e.target.value);
    }, 500);
}

document.querySelector("#generateMovie").addEventListener("click", e=>{
    let movieId = Math.random().toString(36).substr(2,5);
    let rating = Math.random() * 4 + 1;
    rating = rating.toFixed(2);
    rating = rating + "/5";
    let movie = generateMovie("", rating, movieId, true);
    document.querySelector("#selections").appendChild(movie);
})

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);