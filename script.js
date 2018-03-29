"use strict";

const generateMovie = (posterURL, rating, movieID, removeLink) =>{
    let posterDiv = document.createElement("div");
    posterDiv.classList.add("movie");
    posterDiv.dataset.movieID = movieID;

    // Image
    let posterIMG = new Image();
    posterIMG.src = posterURL;
    posterDiv.appendChild(posterIMG);
    
    // Rating
    posterDiv.appendChild(document.createTextNode(rating));

    if(removeLink === true){
        let link = document.createElement("a");
        link.addEventListener("click", e=>{removeMovie(movieID)})
        link.appendChild(document.createTextNode("Remove Movie"));
        posterDiv.appendChild(document.createElement("br"));
        posterDiv.appendChild(link);
    }

    return posterDiv;

}

const removeMovie = movieID => {
    let selections = document.querySelector("#selections");
    let children = selections.children;
    for(let i = 0; i < children.length; i++){
        if(children[i].dataset.movieID == movieID){
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
    let movieID = Math.random().toString(36).substr(2,5);
    let rating = Math.random() * 4 + 1;
    rating = rating.toFixed(2);
    rating = rating + "/5";
    let movie = generateMovie("", rating, movieID, true);
    document.querySelector("#selections").appendChild(movie);
})

document.querySelector("#searchBox").addEventListener("input", populateSuggestions);