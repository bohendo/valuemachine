
def fromForm(dollars, cents):
  if dollars[:1] == '(':
    dollars = '-' + dollars[1:]
  if cents[-1:] == ')':
    cents = cents[:-1]
  number = ''
  number += '0' if str(dollars) == "" else str(dollars)
  number += '.'
  number += '0' if str(cents) == "" else str(cents)
  return float(number)

def toForm(num, isCents):
  strnum = '%.2f' % round(abs(num), 2)
  out = strnum.split('.')[isCents]
  out = '(' + out if num < 0 and isCents == 0 else out
  out = out + ')' if num < 0 and isCents == 1 else out
  return out

