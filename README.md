EN
-----

I get annoyed at the usual Node Red counter. I feel I have no control over it. That's why I made my own, with an additional option.
You can send commands as PAYLOAD:

reset -> clears the timer, does not reset the counter; that is: it adds the time to the counter by the programmed time
resetCounter -> reset the counter, not the timer
resetAll -> reset and timer and counter
kill -> kills timer - with payload
destroy -> destroy timer with no payload


PL
-----
Denerwuje mnie zwykły licznik w Node Red. Czuję, że nie mam nad nim kontroli. Dlatego zrobiłem swój, własny, z dodatkową opcją.

Można wysłać jako PAYLOAD komendy:

 reset -> kasuje timer, nie kasuje licznika ; czyli: dodaje czas do licznika o zaprogramowany czas
 resetCounter - > kasuje licznik, nie kasuje timera
 resetAll -> kasuje i timer i licznik
 kill -> niszczy licznik i powoduje wywołanie zakończenia
 destroy -> niszczy licznik, bez zwrotu zakończenia
