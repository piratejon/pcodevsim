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

struct registers {
  int pc, sp, mp, np, ep;
};

struct DataCell {
  std::string id;
  std::string type;
  int value;
};

class PCodeProgram {
  private:
    std::vector<PCodeLine> istore;
    std::vector<DataCell> dstore;
    std::map<std::string, int> labels;

    void insert_label ( const std::string &, int );
    int insert_instruction ( PCodeLine & );
    void input_file ( std::istream & );

    int lines_read;

    struct registers R;

  public:
    PCodeProgram ( std::istream & );
    int getLinesRead ( );
    int getLabelCount ( );
    bool hasLabel ( const std::string & );
    int getLabel ( const std::string & );
    int getEntryPoint ( );

    void print_instruction_store ( std::ostream & );
    void instruction_listing_format ( std::ostream &, PCodeLine & );
    void display_execution_state ( std::ostream & );
    void initialize_execution_environment ( );
};

#endif // _PCODEPROGRAM_H

