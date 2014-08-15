/****
  jstone25@uco.edu, 2014-08-14
  This class represents a single line in a pcode program
  ****/
#if ! defined ( _PCODELINE_H )
#define _PCODELINE_H

#include <string>

class PCodeLine {
  private:
    std::string label, opcode, op1, op2;
    bool valid;

    std::string trim ( std::string & );

  public:
    PCodeLine(std::string &);

    std::string getLabel();
    std::string getOpcode();
    std::string getOp1();
    std::string getOp2();

    bool definesLabel();
    bool isValid();
    void print(std::ostream &);
};

#endif // _PCODELINE_H

