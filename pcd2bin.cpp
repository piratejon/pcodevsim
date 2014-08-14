
#include <iostream>

#include "pcodeline.h"

int main ( int arfc, char ** arfv ) {

  PCodeLine * pl;
  std::string s;

  s = "L00004    ent       sp        L00005    ";
  pl = new PCodeLine(s);
  pl->print(std::cout);
  delete pl;

  s = "          ent      x x                  ";
  pl = new PCodeLine(s);
  pl->print(std::cout);
  delete pl;

  return 0;
}

