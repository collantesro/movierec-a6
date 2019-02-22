# Assignment 6 of CS3580 Data Science Algorithms: Movie Recommendation Engine

## Screenshots

Live version of this project can be found [here.](https://icarus.cs.weber.edu/~rc63349/CS3580/A6/)

Screenshot of finished assignment:
![Screenshot of finished assignment](Other%20Files/AppScreenshot.png)

Screenshot of assignment instructions:
![Screenshot of assignment instructions on Canvas](Other%20Files/Screenshot-2018-3-28%20Assignment%206.png)


## Comments

Instead of making a PyQt app, Professor Ball allowed me to make it a web page.  As the deadline approached, the professor instead made the GUI-component extra credit.  

In order to run on Icarus, the Computer Science Dept. Linux server, I wrote the back-end script as a Python CGI script.  Performance/Latency is poor, since every request requires that the script load up the entire database of movies into memory.  If I were to redo the assignment, I'd implement the database as a SQLite database or make the back-end into a daemon.

Not included in this repo: the scripts used to prepare the data and poster images.
