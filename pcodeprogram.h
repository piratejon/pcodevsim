/****
  jstone25@uco.edu, 2014-08-14
  This class reads an ASCII pcode program in and replaces labels with absolute
  references and outputs the pcode program in pmachine bytecode format
  ****/
#if ! defined ( _PCODEPROGRAM_H )
#define _PCODEPROGRAM_H

#include <istream>

class PCodeProgram {
  private:
    std::list<PCodeLine*> instructions;
  public:
    PCodeProgram(std::istream &);
};

#endif // _PCODEPROGRAM_H

