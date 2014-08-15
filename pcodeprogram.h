/****
  jstone25@uco.edu, 2014-08-14
  This class reads an ASCII pcode program in and replaces labels with absolute
  references and outputs the pcode program in pmachine bytecode format
  ****/
#if ! defined ( _PCODEPROGRAM_H )
#define _PCODEPROGRAM_H

#include <istream>
#include <vector>
#include <map>

#include "pcodeline.h"

class PCodeProgram {
  private:
    std::vector<PCodeLine> program_listing;
    std::map<std::string, int> labels;

    void insert_label ( const std::string &, int );
    int insert_instruction ( PCodeLine & );
    void input_file ( std::istream & );

  public:
    PCodeProgram(std::istream &);
};

#endif // _PCODEPROGRAM_H

