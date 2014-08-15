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
    std::map<int, std::string> reverse_labels;

    void insert_label ( const std::string &, int );
    void insert_reverse_label ( int, const std::string & );
    int insert_instruction ( PCodeLine & );
    void input_file ( std::istream & );

    int lines_read;

    struct registers R;

    bool halted;

  public:
    PCodeProgram ( std::istream & );
    int getLinesRead ( );
    int getLabelCount ( );
    bool hasLabel ( const std::string & );
    int lookupLabel ( const std::string & );
    const std::string lookupLine ( int );
    int getEntryPoint ( );

    void print_instruction_store ( std::ostream & );
    void instruction_listing_format ( std::ostream &, PCodeLine & );
    void display_execution_state ( std::ostream & );
    void initialize_execution_environment ( );

    bool isHalted ( );
    void step ( );
};

#endif // _PCODEPROGRAM_H

