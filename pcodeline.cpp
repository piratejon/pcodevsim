/***
  jstone25@uco.edu
  This file implements the PCodeLine class defined in pcodeline.h
  ***/
#include "pcodeline.h"

/***
  This function parses a line into its constituent components. Whitespace
  sensitive.
  ***/
PCodeLine::PCodeLine(std::string & line) {
}

std::string PCodeLine::getLabel() {
  return label;
}

std::string PCodeLine::getOpcode() {
  return opcode;
}

std::string PCodeLine::getOp1() {
  return op1;
}

std::string PCodeLine::getOp2() {
  return op2;
}

